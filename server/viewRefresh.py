import time
import os
from supabase import create_client

SUPABASE_URL = "https://swffwjjveghovalezabk.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

VIEWS_TO_REFRESH = [
    "champion_stats",
    "team_matches"
]

def refresh_views():
    for view in VIEWS_TO_REFRESH:
        try:
            supabase.rpc("refresh_all_views", {view}).execute()
            print(f"Refreshed {view} successfully")
        except Exception as e:
            print(f"Error refreshing {view}: {e}")

if __name__ == "__main__":
    while True:
        print("Refreshing materialized views...")
        refresh_views()
        print("Done. Sleeping 10 minutes...")
        time.sleep(600)  # 600 seconds = 10 minutes