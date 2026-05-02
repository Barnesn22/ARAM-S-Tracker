import requests
from supabase import create_client
import os

SUPABASE_URL = "https://swffwjjveghovalezabk.supabase.co"
SUPABASE_KEY = os.getenv("SERVICE_KEY")
AUGMENTS_URL = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/cherry-augments.json"

res = requests.get(AUGMENTS_URL).json()
augment_rows = []
seen = set()
for aug in res:
    if aug["id"] == -1:
        continue
    seen.add(aug["id"])
    aug_row = {
        "augment_id": aug["id"],
        "name": aug["nameTRA"],
        "rarity": aug["rarity"],
        "iconPath": aug["augmentSmallIconPath"]
    }
    augment_rows.append(aug_row)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
supabase.table("Augments").upsert(augment_rows).execute()