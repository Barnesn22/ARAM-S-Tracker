import requests
from supabase import create_client

SUPABASE_URL = "https://swffwjjveghovalezabk.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3ZmZ3amp2ZWdob3ZhbGV6YWJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTczODM1MCwiZXhwIjoyMDg3MzE0MzUwfQ.S9DvKqQx7z5TKyZj1CwHFgZt5rvI1rn-kfTdrcaHlmA"
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