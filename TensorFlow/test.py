from supabase import create_client

url = "https://swffwjjveghovalezabk.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3ZmZ3amp2ZWdob3ZhbGV6YWJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzgzNTAsImV4cCI6MjA4NzMxNDM1MH0.CNqC6V41b1y8mVfiyww9JfImwdzT4BvycMhyDIgjN74"
supabase = create_client(url, key)

response = (
        supabase
        .table("champion_stats")
        .select("*")
        .execute()
    )
data = response.data
champ_winrate = {c["champ_id"]: c["winrate"] for c in data}