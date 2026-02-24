from pyspark.sql import SparkSession
from pyspark.sql.functions import explode, col
from pyspark.sql.functions import array
import os

spark = SparkSession.builder \
    .appName("RiotIngestion") \
    .config("spark.jars.packages", "org.postgresql:postgresql:42.6.0") \
    .getOrCreate()

df = spark.read.json("data/AMERICAS/NA1_5475143055.json.gz")

games_df = df.select(
    col("metadata.matchId").alias("id"),
    col("info.gameCreation").alias("game_creation"),
    col("info.gameDuration").alias("game_duration"),
    col("info.gameMode").alias("game_mode")
)

# Extract participants
participants_df = df.select(
    col("metadata.matchId").alias("game_id"),
    explode("info.participants").alias("p")
).select(
    col("game_id"),
    col("p.puuid"),
    col("p.championId").alias("champion_id"),
    col("p.win"),
    col("p.kills"),
    col("p.deaths"),
    col("p.assists"),
    col("p.goldEarned")
)

items_df = df.select(
    col("metadata.matchId").alias("game_id"),
    explode("info.participants").alias("p")
).select(
    col("game_id"),
    col("p.puuid"),
    array(
        col("p.item0"),
        col("p.item1"),
        col("p.item2"),
        col("p.item3"),
        col("p.item4"),
        col("p.item5")
    ).alias("items")
)
# postgresql://postgres.swffwjjveghovalezabk:[YOUR-PASSWORD]@aws-1-us-east-1.pooler.supabase.com:5432/postgres
url = "jdbc:postgresql://aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"
PASSWORD = os.getenv("POSTGRES_PASSWORD")
print(PASSWORD)
properties = {
    "user": "postgres.swffwjjveghovalezabk",
    "password": PASSWORD,
    "driver": "org.postgresql.Driver"
}

games_df.write \
    .jdbc(url=url, table='"Games"', mode="append", properties=properties)

participants_df.write \
    .jdbc(url=url, table='"Participants"', mode="append", properties=properties)

items_df.write \
    .jdbc(url=url, table='"Items"', mode="append", properties=properties)

