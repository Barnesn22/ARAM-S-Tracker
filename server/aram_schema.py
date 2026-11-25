# aram_schema.py – typed representation and PyArrow schemas for the Parquet tables
# Used by injestion_to_parquet.py for column ordering, types, and nullability.

from typing import List, TypedDict, Optional
import pandas as pd
import pyarrow as pa


class MatchRow(TypedDict):
    match_id: str
    region: Optional[str]
    patch: str
    game_creation: pd.Timestamp  # ms-precision UTC
    game_date: pd.Timestamp      # UTC date
    game_duration: Optional[int]
    game_mode: Optional[int]
    ingested_at: pd.Timestamp


class ParticipantRow(TypedDict):
    match_id: str
    puuid: str
    patch: str
    game_date: pd.Timestamp
    champ_id: int
    team_id: Optional[int]
    win: Optional[bool]
    kills: Optional[int]
    deaths: Optional[int]
    assists: Optional[int]
    pentakills: Optional[int]
    total_damage_dealt: Optional[int]
    magic_damage: Optional[int]
    physical_damage: Optional[int]
    true_damage_dealt: Optional[int]
    total_damage_taken: Optional[int]
    damage_self_mitigated: Optional[int]
    damage_to_objectives: Optional[int]
    gold_earned: Optional[int]
    total_heal: Optional[int]
    time_cc_others: Optional[float]
    items: List[int]
    augments: List[int]


class SummonerRow(TypedDict):
    puuid: str
    summoner_name: Optional[str]
    tagline: Optional[str]
    region: Optional[str]
    updated_at: pd.Timestamp


MATCHES_SCHEMA = pa.schema([
    pa.field("match_id", pa.string(), nullable=False),
    pa.field("region", pa.string(), nullable=True),
    pa.field("patch", pa.string(), nullable=False),
    pa.field("game_creation", pa.timestamp("ms", tz="UTC"), nullable=True),
    pa.field("game_date", pa.date32(), nullable=True),
    pa.field("game_duration", pa.int32(), nullable=True),
    pa.field("game_mode", pa.int32(), nullable=True),
    pa.field("ingested_at", pa.timestamp("ms", tz="UTC"), nullable=True),
])

PARTICIPANTS_SCHEMA = pa.schema([
    pa.field("match_id", pa.string(), nullable=False),
    pa.field("puuid", pa.string(), nullable=False),
    pa.field("patch", pa.string(), nullable=False),
    pa.field("game_date", pa.date32(), nullable=True),
    pa.field("champ_id", pa.int32(), nullable=False),
    pa.field("team_id", pa.int16(), nullable=True),
    pa.field("win", pa.bool_(), nullable=True),
    pa.field("kills", pa.int16(), nullable=True),
    pa.field("deaths", pa.int16(), nullable=True),
    pa.field("assists", pa.int16(), nullable=True),
    pa.field("pentakills", pa.int16(), nullable=True),
    pa.field("total_damage_dealt", pa.int32(), nullable=True),
    pa.field("magic_damage", pa.int32(), nullable=True),
    pa.field("physical_damage", pa.int32(), nullable=True),
    pa.field("true_damage_dealt", pa.int32(), nullable=True),
    pa.field("total_damage_taken", pa.int32(), nullable=True),
    pa.field("damage_self_mitigated", pa.int32(), nullable=True),
    pa.field("damage_to_objectives", pa.int32(), nullable=True),
    pa.field("gold_earned", pa.int32(), nullable=True),
    pa.field("total_heal", pa.int32(), nullable=True),
    pa.field("time_cc_others", pa.float32(), nullable=True),
    pa.field("items", pa.list_(pa.int32()), nullable=True),
    pa.field("augments", pa.list_(pa.int32()), nullable=True),
])

SUMMONERS_SCHEMA = pa.schema([
    pa.field("puuid", pa.string(), nullable=False),
    pa.field("summoner_name", pa.string(), nullable=True),
    pa.field("tagline", pa.string(), nullable=True),
    pa.field("region", pa.string(), nullable=True),
    pa.field("updated_at", pa.timestamp("ms", tz="UTC"), nullable=True),
])
