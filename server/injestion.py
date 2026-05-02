import time
import json
import os
from datetime import datetime
from supabase import create_client
import subprocess
import platform
import re
import sys
import requests
import urllib3
import traceback
import concurrent.futures
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ---------------------------
# CONFIG
# ---------------------------

SUPABASE_URL = "https://swffwjjveghovalezabk.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
RAW_FOLDER = "raw_matches"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ---------------------------
# LCU AUTH
# ---------------------------

def get_lcu_credentials():
    system = platform.system()

    if system == "Windows":
        cmd = [
            "wmic",
            "PROCESS",
            "WHERE",
            "name='LeagueClientUx.exe'",
            "GET",
            "commandline"
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        output = result.stdout

    elif system in ("Darwin", "Linux"):
        cmd = "ps -A | grep LeagueClientUx"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        output = result.stdout

    else:
        raise Exception(f"Unsupported OS: {system}")

    if not output:
        raise Exception("LeagueClientUx process not found. Is the client open?")

    # Extract port
    port_match = re.search(r"--app-port=([0-9]*)", output)
    token_match = re.search(r"--remoting-auth-token=([\w-]*)", output)

    if not port_match or not token_match:
        raise Exception("Could not extract LCU credentials.")

    port = port_match.group(1)
    auth_token = token_match.group(1)

    print(f"Found LCU port={port}")

    return port, auth_token

def lcu_request(port, auth_token, endpoint):
    url = f"https://127.0.0.1:{port}{endpoint}"
    response = requests.get(
        url,
        auth=("riot", auth_token),
        verify=False
    )

    response.raise_for_status()
    return response.json()

# ---------------------------
# DB HELPERS
# ---------------------------

def get_next_match_id():
    result = supabase.table("match_queue") \
        .select("*") \
        .limit(1) \
        .execute()

    if not result.data:
        return None

    match_id = result.data[0]["match_id"]

    # delete it from queue
    supabase.table("match_queue") \
        .delete() \
        .eq("match_id", match_id) \
        .execute()

    return match_id

def insert_new_match_ids(match_ids):
    rows = [{"match_id": m, "region": "AMERICAS"} for m in match_ids]

    # use upsert to avoid duplicates
    supabase.table("match_queue") \
        .upsert(rows) \
        .execute()

    supabase.rpc("delete_processed_matches", {}).execute()


# ---------------------------
# TRANSFORM + LOAD
# ---------------------------

def transform_and_load(match_json):
    game_id = match_json["gameId"]

    # -----------------------
    # Insert game
    # -----------------------
    game_row = {
        "match_id": game_id,
        "game_creation": match_json["gameCreationDate"],
        "game_duration": match_json["gameDuration"],
        "game_mode": match_json["queueId"],
        "patch": match_json["gameVersion"]
    }

    try:
        supabase.table("games").insert(game_row).execute()
    except Exception as e:
        print("ERROR inserting game:", e)
        return

    # -----------------------
    # Build identity lookup (avoid nested loop)
    # -----------------------
    identity_map = {
        p["participantId"]: p["player"]
        for p in match_json["participantIdentities"]
    }

    participant_rows = []
    summoner_rows = []

    # -----------------------
    # Build participant rows
    # -----------------------
    for p in match_json["participants"]:
        player = identity_map[p["participantId"]]

        puuid = player["puuid"]
        stats = p["stats"]

        participant_rows.append({
            "match_id": game_id,
            "puuid": puuid,
            "champ_id": p["championId"],
            "team_id": p["teamId"],
            "win": stats["win"],
            "kills": stats["kills"],
            "deaths": stats["deaths"],
            "assists": stats["assists"],
            "total_damage_dealt": stats["totalDamageDealtToChampions"],
            "gold_earned": stats["goldEarned"],
            "damage_self_mitigated": stats["damageSelfMitigated"],
            "damage_to_objectives": stats["damageDealtToObjectives"],
            "pentakills": stats["pentaKills"],
            "magic_damage": stats["magicDamageDealtToChampions"],
            "physical_damage": stats["physicalDamageDealtToChampions"],
            "time_CC_others": stats["timeCCingOthers"],
            "total_damage_taken": stats["totalDamageTaken"],
            "total_heal": stats["totalHeal"],
            "true_damage_dealt": stats["trueDamageDealtToChampions"]
        })

        summoner_rows.append({
            "puuid": puuid,
            "summoner_name": player["gameName"],
            "region": player["platformId"],
            "tagline": player["tagLine"]
        })

    # -----------------------
    # Upsert summoners
    # -----------------------
    supabase.table("summoners").upsert(summoner_rows).execute()

    # -----------------------
    # Insert participants + RETURN IDs
    # -----------------------
    res = supabase.table("participants") \
        .insert(participant_rows, returning="representation") \
        .execute()

    inserted_participants = res.data

    if not inserted_participants:
        print("ERROR: No participant IDs returned")
        return

    # -----------------------
    # Build lookup map
    # -----------------------
    participant_map = {
        (p["match_id"], p["puuid"]): p["id"]
        for p in inserted_participants
    }

    participant_item_rows = []
    participant_augment_rows = []

    # -----------------------
    # Build child rows using participant_id
    # -----------------------
    for p in match_json["participants"]:
        player = identity_map[p["participantId"]]
        puuid = player["puuid"]
        stats = p["stats"]

        participant_id = participant_map[(game_id, puuid)]

        # Items
        for slot in range(7):
            participant_item_rows.append({
                "participant_id": participant_id,
                "item_id": stats[f"item{slot}"],
                "slot": slot
            })

        # Augments
        for slot in range(1, 7):
            augment_id = stats[f"playerAugment{slot}"]

            if augment_id == 0:
                continue  # skip empty augment slots

            participant_augment_rows.append({
                "participant_id": participant_id,
                "augment_id": augment_id,
                "slot": slot
            })

    # -----------------------
    # Insert child tables
    # -----------------------
    supabase.table("participant_items").insert(participant_item_rows).execute()
    supabase.table("participant_augments").insert(participant_augment_rows).execute()
    
port, auth_token = 0, 0

# ---------------------------
# MAIN LOOP
# ---------------------------

def main():
    global port, auth_token
    get_histories = True
    os.makedirs(RAW_FOLDER, exist_ok=True)

    print("Getting LCU credentials...")
    port, auth_token = get_lcu_credentials()
    

    print("Starting ingestion loop...")

    while True:
        try:
            match_id = get_next_match_id()

            if not match_id:
                print("Queue empty. Sleeping...")
                time.sleep(1)
                continue

            print(f"Processing match {match_id}")

            # Fetch match
            match_json = lcu_request(
                port,
                auth_token,
                f"/lol-match-history/v1/games/{match_id}"
            )

            if match_json["queueId"] != 2400:
                print("Not Mayhem, skipping")
                continue

            response = supabase.table("match_queue").select("*", count="exact").execute()
            get_histories = response.count < 1000

            # Save raw JSON
            filepath = os.path.join(
                RAW_FOLDER,
                f"{match_id}_{datetime.now().timestamp()}.json"
            )

            with open(filepath, "w") as f:
                json.dump(match_json, f)

            # Transform + load
            transform_and_load(match_json)

            if not get_histories:
                continue
            
            response = supabase.table("games").select("match_id").execute()
            match_ids = {str(row["match_id"]) for row in response.data}

            # Get player match histories
            new_match_ids = set()
            for i, p in enumerate(match_json['participantIdentities']):
                if i % 2 != 0:
                    continue

                puuid = p['player']['puuid']
                print(puuid)

                history= lcu_request(
                    port,
                    auth_token,
                    f"/lol-match-history/v1/products/lol/{puuid}/matches"
                )
                for m in history['games']['games']:
                    if str(m['gameId']) not in match_ids:
                        new_match_ids.add(str(m['gameId']))
                        print("found new game")
                    else:
                        print("seen game before")

            insert_new_match_ids(new_match_ids)

        

        except Exception as e:
            print("Error:", e)
            traceback.print_exc()



if __name__ == "__main__":
    main()