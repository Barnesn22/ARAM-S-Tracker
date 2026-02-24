import requests
from supabase import create_client
import os
import re

def format_lcu_text_verbose(raw_text: str) -> str:
    # Convert unicode angle brackets
    text = raw_text.replace(r"\u003C", "<").replace(r"\u003E", ">")

    # ------------------------
    # Stats
    # ------------------------
    def extract_stats(match):
        stats_content = match.group(1)
        parts = re.findall(r"<attention>(.*?)</attention>\s*(.*?)($|<br>)", stats_content, flags=re.DOTALL)
        formatted_stats = [f"{val.strip()} {name.strip()}" for val, name, _ in parts]
        return " | ".join(formatted_stats) + ". "
    
    text = re.sub(r"<stats>(.*?)</stats>", extract_stats, text, flags=re.DOTALL)

    # ------------------------
    # Passives
    # ------------------------
    # Find passive names AND the effect text that follows them
    passive_pattern = r"<passive>(.*?)</passive>\s*(.*?)(?=(<passive>|$))"
    passive_matches = re.findall(passive_pattern, text, flags=re.DOTALL)
    
    formatted_passives = []
    for name, effect, _ in passive_matches:
        # Clean tags and whitespace
        name = re.sub(r"<[^>]+>", "", name).strip()
        effect = re.sub(r"<[^>]+>", "", effect).strip()
        if effect:
            formatted_passives.append(f"{name}: {effect}")
        else:
            formatted_passives.append(name)
    
    passives_str = " | ".join(formatted_passives)

    # ------------------------
    # Remove leftover tags and extra spaces
    # ------------------------
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\s+", " ", text)

    # ------------------------
    # Combine stats and passives
    # ------------------------
    stats_end_idx = text.find(". ") + 2 if ". " in text else 0
    stats_str = text[:stats_end_idx].strip()
    
    return f"{stats_str} {passives_str}".strip()

ITEM_URL = "https://ddragon.leagueoflegends.com/cdn/16.4.1/data/en_US/item.json"
SUPABASE_URL = "https://swffwjjveghovalezabk.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

res = requests.get(ITEM_URL).json()
item_rows = []
for item_id in res["data"]:
    item_row = {
        "item_id": item_id,
        "name": res["data"][item_id]["name"],
        "cost": res["data"][item_id]["gold"]["total"],
        "description": format_lcu_text_verbose(res["data"][item_id]["description"]),
        "tags": res["data"][item_id]["tags"]
    }
    item_rows.append(item_row)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
supabase.table("Items").upsert(item_rows).execute()
