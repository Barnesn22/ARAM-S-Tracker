import time
import json
import os
from datetime import datetime
import mysql.connector
from mysql.connector import Error
import subprocess
import platform
import re
import sys
import requests
import urllib3
import traceback
import concurrent.futures
from dotenv import load_dotenv
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ---------------------------
# CONFIG
# ---------------------------

# Load .env from root directory
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

# Oracle MySQL Heatwave Configuration
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "aram_tracker")
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")

RAW_FOLDER = "raw_matches"

# Database connection
db_connection = None

def get_db_connection():
    """Get or create database connection"""
    global db_connection
    try:
        if db_connection is None or not db_connection.is_connected():
            db_connection = mysql.connector.connect(
                host=MYSQL_HOST,
                port=MYSQL_PORT,
                database=MYSQL_DATABASE,
                user=MYSQL_USER,
                password=MYSQL_PASSWORD
            )
            print("Connected to database")
        return db_connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        raise

# ---------------------------
# RATE LIMITING
# ---------------------------

class RateLimiter:
    def __init__(self, max_requests_per_second=10):
        self.max_requests_per_second = max_requests_per_second
        self.requests = []
        self.min_interval = 1.0 / max_requests_per_second
    
    def wait_if_needed(self):
        """Wait if we've exceeded the rate limit"""
        current_time = time.time()
        
        # Remove requests older than 1 second
        self.requests = [req_time for req_time in self.requests if current_time - req_time < 1.0]
        
        # If we've hit the limit, wait until we can make another request
        if len(self.requests) >= self.max_requests_per_second:
            oldest_request = min(self.requests)
            sleep_time = 1.0 - (current_time - oldest_request)
            if sleep_time > 0:
                time.sleep(sleep_time)
                current_time = time.time()  # Update current time after sleep
        
        # Also ensure minimum interval between requests to prevent bursts
        if self.requests:
            time_since_last = current_time - self.requests[-1]
            if time_since_last < self.min_interval:
                time.sleep(self.min_interval - time_since_last)
                current_time = time.time()  # Update current time after sleep
        
        # Record this request
        self.requests.append(current_time)

# Global rate limiter instance
rate_limiter = RateLimiter(10)

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
    # Apply rate limiting before making the request
    rate_limiter.wait_if_needed()
    
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
    """Get next match_id from match_queue table"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Get next match from queue
        query = "SELECT match_id FROM match_queue ORDER BY inserted_at ASC LIMIT 1"
        cursor.execute(query)
        result = cursor.fetchone()
        
        if not result:
            return None
        
        match_id = result["match_id"]
        
        # Delete it from queue
        delete_query = "DELETE FROM match_queue WHERE match_id = %s"
        cursor.execute(delete_query, (match_id,))
        conn.commit()
        
        return match_id
        
    finally:
        cursor.close()

def insert_new_match_ids(match_ids, region="AMERICAS"):
    """Insert new match IDs into match_queue table"""
    if not match_ids:
        return
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Prepare data for insertion
        current_time = datetime.now()
        rows = [(match_id, region, current_time) for match_id in match_ids]
        
        # Use INSERT IGNORE to avoid duplicates
        query = """
        INSERT IGNORE INTO match_queue (match_id, region, inserted_at) 
        VALUES (%s, %s, %s)
        """
        cursor.executemany(query, rows)
        conn.commit()
        
    finally:
        cursor.close()

def get_existing_match_ids():
    """Get all existing match IDs from games table"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        query = "SELECT match_id FROM games"
        cursor.execute(query)
        return {str(row[0]) for row in cursor.fetchall()}
    finally:
        cursor.close()

def get_games_count():
    """Get count of games in match_queue"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        query = "SELECT COUNT(*) FROM match_queue"
        cursor.execute(query)
        return cursor.fetchone()[0]
    finally:
        cursor.close()

# ---------------------------
# TRANSFORM + LOAD
# ---------------------------

def transform_and_load(match_json):
    """Transform match data and load into MySQL database"""
    game_id = str(match_json["gameId"])  # Convert to string to handle large numbers
    
    # Filter for specific game version
    game_version = match_json.get("gameVersion", "")
    if not game_version.startswith("16.9"):
        print(f"Skipping match {game_id} - wrong version: {game_version}")
        return
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # -----------------------
        # Insert game
        # -----------------------
        # Parse ISO 8601 datetime string
        game_creation_str = match_json["gameCreationDate"]
        game_creation = datetime.fromisoformat(game_creation_str.replace('Z', '+00:00'))
        
        game_query = """
        INSERT INTO games (match_id, game_creation, game_duration, game_mode, patch)
        VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(game_query, (
            game_id,
            game_creation,
            match_json["gameDuration"],
            match_json["queueId"],
            match_json["gameVersion"]
        ))
        
        # -----------------------
        # Build identity lookup
        # -----------------------
        identity_map = {
            p["participantId"]: p["player"]
            for p in match_json["participantIdentities"]
        }
        
        participant_rows = []
        summoner_rows = []
        
        # -----------------------
        # Build participant and summoner rows
        # -----------------------
        for p in match_json["participants"]:
            player = identity_map[p["participantId"]]
            puuid = player["puuid"]
            stats = p["stats"]
            
            # Ensure all stats values exist, use 0 as default if missing
            participant_row = (
                game_id,                                    # 1
                puuid,                                      # 2
                p["championId"],                            # 3
                p["teamId"],                                # 4
                stats.get("win", False),                    # 5
                stats.get("kills", 0),                      # 6
                stats.get("deaths", 0),                     # 7
                stats.get("assists", 0),                    # 8
                stats.get("totalDamageDealtToChampions", 0), # 9
                stats.get("goldEarned", 0),                 # 10
                stats.get("damageSelfMitigated", 0),        # 11
                stats.get("damageDealtToObjectives", 0),     # 12
                stats.get("pentaKills", 0),                 # 13
                stats.get("magicDamageDealtToChampions", 0), # 14
                stats.get("physicalDamageDealtToChampions", 0), # 15
                stats.get("timeCCingOthers", 0),             # 16
                stats.get("totalDamageTaken", 0),            # 17
                stats.get("totalHeal", 0),                   # 18
                stats.get("trueDamageDealtToChampions", 0)   # 19
            )
            participant_rows.append(participant_row)
            
            summoner_rows.append((
                puuid,
                player["gameName"],
                player["platformId"],
                player["tagLine"]
            ))
        
        # -----------------------
        # Upsert summoners
        # -----------------------
        summoner_query = """
        INSERT INTO summoners (puuid, summoner_name, region, tagline)
        VALUES (%s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
        summoner_name = VALUES(summoner_name),
        region = VALUES(region),
        tagline = VALUES(tagline)
        """
        cursor.executemany(summoner_query, summoner_rows)
        
        # -----------------------
        # Insert participants
        # -----------------------
        participant_query = """
        INSERT INTO participants (
            match_id, puuid, champ_id, team_id, win, kills, deaths, assists,
            total_damage_dealt, gold_earned, damage_self_mitigated, damage_to_objectives,
            pentakills, magic_damage, physical_damage, time_CC_others, total_damage_taken,
            total_heal, true_damage_dealt
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.executemany(participant_query, participant_rows)
        
        # Get inserted participant IDs
        participant_ids = []
        for p in match_json["participants"]:
            player = identity_map[p["participantId"]]
            puuid = player["puuid"]
            
            cursor.execute(
                "SELECT id FROM participants WHERE match_id = %s AND puuid = %s",
                (game_id, puuid)
            )
            result = cursor.fetchone()
            if result:
                participant_ids.append(result[0])
        
        # -----------------------
        # Build child rows using participant_id
        # -----------------------
        participant_item_rows = []
        participant_augment_rows = []
        
        for i, p in enumerate(match_json["participants"]):
            stats = p["stats"]
            participant_id = participant_ids[i]
            
            # Items (slots 0-6)
            for slot in range(7):
                item_id = stats.get(f"item{slot}", 0)
                participant_item_rows.append((item_id, slot, participant_id))
            
            # Augments (slots 1-6, skip if 0)
            for slot in range(1, 7):
                augment_id = stats.get(f"playerAugment{slot}", 0)
                if augment_id != 0:
                    participant_augment_rows.append((slot, augment_id, participant_id))
        
        # -----------------------
        # Insert child tables
        # -----------------------
        if participant_item_rows:
            item_query = """
            INSERT INTO participant_items (item_id, slot, participant_id)
            VALUES (%s, %s, %s)
            """
            cursor.executemany(item_query, participant_item_rows)
        
        if participant_augment_rows:
            augment_query = """
            INSERT INTO participant_augments (slot, augment_id, participant_id)
            VALUES (%s, %s, %s)
            """
            cursor.executemany(augment_query, participant_augment_rows)
        
        conn.commit()
        print(f"Successfully processed match {game_id}")
        
    except Exception as e:
        conn.rollback()
        print(f"ERROR processing match {game_id}: {e}")
        raise
    finally:
        cursor.close()

# ---------------------------
# MAIN LOOP
# ---------------------------

port, auth_token = 0, 0

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

            queue_count = get_games_count()
            get_histories = queue_count < 1000

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
            
            # Get existing match IDs
            existing_match_ids = get_existing_match_ids()
            # Always get histories to keep queue populated
            get_histories = True

            # Get player match histories
            new_match_ids = set()
            for i, p in enumerate(match_json['participantIdentities']):
                if i % 2 != 0:
                    continue

                puuid = p['player']['puuid']
                print(f"Getting history for {puuid}")

                try:
                    history = lcu_request(
                        port,
                        auth_token,
                        f"/lol-match-history/v1/products/lol/{puuid}/matches"
                    )
                    
                    for m in history['games']['games']:
                        if str(m['gameId']) in existing_match_ids:
                            print("Seen game before")
                        elif not m['gameVersion'].startswith("16.9"):
                            print("Not version 16.9, skipping")
                        else:
                            new_match_ids.add(str(m['gameId']))
                            print("Found new game")
                            
                except Exception as e:
                    print(f"Error getting history for {puuid}: {e}")

            insert_new_match_ids(new_match_ids)

        except Exception as e:
            print("Error:", e)
            traceback.print_exc()
            time.sleep(5)  # Wait before retrying

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        if db_connection and db_connection.is_connected():
            db_connection.close()
            print("Database connection closed")
