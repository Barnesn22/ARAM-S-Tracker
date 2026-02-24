import requests
from supabase import create_client
import os

SUPABASE_URL = "https://swffwjjveghovalezabk.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
CHAMPIONS_URL = "https://ddragon.leagueoflegends.com/cdn/16.4.1/data/en_US/champion.json"

res = requests.get(CHAMPIONS_URL).json()
champion_rows = []
for champ in res["data"]:
    champion = res["data"][champ]
    champion_row = {
        "champion_id": champion["key"],
        "name": champion["name"],
        "tags": champion["tags"],
        "name_id": champion["id"]
    }
    champion_rows.append(champion_row)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
supabase.table("Champions").upsert(champion_rows).execute()