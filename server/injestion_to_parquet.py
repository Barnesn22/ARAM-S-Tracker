"""Ingestion -> Parquet conversion for ARAM-S-Tracker.

This module implements the three tables described in `schema/DATA_MODEL.md`:
* `matches`      – fact table, partitioned by `patch` (append-only)
* `participants` – fact table, partitioned by `patch` (append-only)
* `summoners`    – dimension table (single file, upserted by `puuid`)

It is a Parquet lift-and-shift of `mysql_injestion.py` using pandas and pyarrow.
"""

import hashlib
import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Set

import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

try:
    from aram_schema import MATCHES_SCHEMA, PARTICIPANTS_SCHEMA, SUMMONERS_SCHEMA
except ImportError:
    from .aram_schema import MATCHES_SCHEMA, PARTICIPANTS_SCHEMA, SUMMONERS_SCHEMA


# ------------------------------------------------------------------
# Helpers: field extraction & DataFrame construction
# ------------------------------------------------------------------
def _extract_patch(match_json: Dict[str, Any]) -> str:
    """Extract major.minor patch string (e.g. '16.23') from match JSON."""
    if match_json.get("patch"):
        return str(match_json["patch"])
    game_version = match_json.get("gameVersion", "")
    if game_version:
        parts = str(game_version).split(".")
        if len(parts) >= 2:
            return f"{parts[0]}.{parts[1]}"
        return str(game_version)
    return "unknown"


def _parse_game_creation(match_json: Dict[str, Any]) -> pd.Timestamp:
    """Parse game creation time into a UTC pandas Timestamp."""
    if "gameCreationDate" in match_json and match_json["gameCreationDate"] is not None:
        raw = match_json["gameCreationDate"]
        if isinstance(raw, (int, float)):
            return pd.to_datetime(raw, unit="ms", utc=True)
        return pd.to_datetime(str(raw), utc=True)
    if "gameCreation" in match_json and match_json["gameCreation"] is not None:
        return pd.to_datetime(match_json["gameCreation"], unit="ms", utc=True)
    raise KeyError("Match JSON missing both 'gameCreationDate' and 'gameCreation'")


def build_rows(match_json: Dict[str, Any]) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Transform a raw Riot/LCU match JSON into three pandas DataFrames.

    Returns (matches_df, participants_df, summoners_df).
    """
    match_id = str(match_json["gameId"])
    region = match_json.get("region") or match_json.get("platformId")
    patch = _extract_patch(match_json)
    game_creation = _parse_game_creation(match_json).floor("ms")
    game_date = game_creation.normalize().date()
    game_duration = match_json.get("gameDuration")
    game_mode = match_json.get("queueId")
    ingested_at = pd.Timestamp.now(tz="UTC").floor("ms")

    matches_df = pd.DataFrame([
        {
            "match_id": match_id,
            "region": region,
            "patch": patch,
            "game_creation": game_creation,
            "game_date": game_date,
            "game_duration": game_duration,
            "game_mode": game_mode,
            "ingested_at": ingested_at,
        }
    ])

    identity_map = {
        p["participantId"]: p["player"] for p in match_json["participantIdentities"]
    }

    participant_rows: List[Dict[str, Any]] = []
    summoner_rows: List[Dict[str, Any]] = []

    for p in match_json["participants"]:
        pid = p["participantId"]
        player = identity_map[pid]
        puuid = player["puuid"]
        stats = p["stats"]

        items = [int(stats.get(f"item{i}", 0) or 0) for i in range(7)]
        augments = [
            int(stats.get(f"playerAugment{i}", 0))
            for i in range(1, 7)
            if stats.get(f"playerAugment{i}", 0) != 0
        ]

        participant_rows.append(
            {
                "match_id": match_id,
                "puuid": puuid,
                "patch": patch,
                "game_date": game_date,
                "champ_id": p["championId"],
                "team_id": p.get("teamId"),
                "win": bool(stats.get("win", False)),
                "kills": stats.get("kills", 0),
                "deaths": stats.get("deaths", 0),
                "assists": stats.get("assists", 0),
                "pentakills": stats.get("pentaKills", 0),
                "total_damage_dealt": stats.get("totalDamageDealtToChampions", 0),
                "magic_damage": stats.get("magicDamageDealtToChampions", 0),
                "physical_damage": stats.get("physicalDamageDealtToChampions", 0),
                "true_damage_dealt": stats.get("trueDamageDealtToChampions", 0),
                "total_damage_taken": stats.get("totalDamageTaken", 0),
                "damage_self_mitigated": stats.get("damageSelfMitigated", 0),
                "damage_to_objectives": stats.get("damageDealtToObjectives", 0),
                "gold_earned": stats.get("goldEarned", 0),
                "total_heal": stats.get("totalHeal", 0),
                "time_cc_others": float(stats.get("timeCCingOthers", 0)),
                "items": items,
                "augments": augments,
            }
        )

        summoner_rows.append(
            {
                "puuid": puuid,
                "summoner_name": player.get("gameName"),
                "tagline": player.get("tagLine"),
                "region": player.get("platformId"),
                "updated_at": ingested_at,
            }
        )

    participants_df = pd.DataFrame(participant_rows)
    summoners_df = pd.DataFrame(summoner_rows).drop_duplicates(subset=["puuid"], keep="last")

    return matches_df, participants_df, summoners_df


def get_existing_match_ids(base_dir: Path) -> Set[str]:
    """Read all existing match_id values from data/matches/**/*.parquet."""
    matches_root = base_dir / "data" / "matches"
    if not matches_root.exists():
        return set()

    existing: Set[str] = set()
    for p in matches_root.rglob("*.parquet"):
        table = pq.read_table(p, columns=["match_id"])
        existing.update(str(v) for v in table.column("match_id").to_pylist() if v is not None)
    return existing


# ------------------------------------------------------------------
# Parquet writer – respects the layout from DATA_MODEL.md
# ------------------------------------------------------------------
def _write_parquet(df: pd.DataFrame, out_path: Path, schema: pa.Schema) -> None:
    """Write *df* to *out_path* atomically using zstd compression and explicit schema."""
    table = pa.Table.from_pandas(df, schema=schema, preserve_index=False)
    tmp_path = out_path.with_suffix(".tmp")
    pq.write_table(
        table,
        tmp_path,
        compression="zstd",
        use_dictionary=True,
        row_group_size=100_000,
    )
    tmp_path.replace(out_path)


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _update_manifest(base_dir: Path) -> None:
    """Regenerate data/manifest.json following schema/DATA_MODEL.md."""
    data_dir = base_dir / "data"
    manifest_path = data_dir / "manifest.json"

    def _collect_partitioned(root: Path) -> List[Dict[str, Any]]:
        files: List[Dict[str, Any]] = []
        if not root.exists():
            return files
        for p in sorted(root.rglob("*.parquet")):
            rel = p.relative_to(data_dir)
            meta = pq.read_metadata(p)
            patch_val = p.parent.name.split("=", 1)[-1] if "patch=" in p.parent.name else None
            files.append({
                "path": str(rel).replace(os.sep, "/"),
                "patch": patch_val,
                "rows": meta.num_rows,
                "bytes": p.stat().st_size,
                "sha256": _sha256_file(p),
            })
        return files

    summ_file = data_dir / "summoners.parquet"
    summ_files: List[Dict[str, Any]] = []
    if summ_file.is_file():
        summ_meta = pq.read_metadata(summ_file)
        summ_files.append({
            "path": "summoners.parquet",
            "patch": None,
            "rows": summ_meta.num_rows,
            "bytes": summ_file.stat().st_size,
            "sha256": _sha256_file(summ_file),
        })

    manifest = {
        "schema_version": 1,
        "generated_at": pd.Timestamp.now(tz="UTC").isoformat(),
        "tables": {
            "matches": {
                "category": "fact",
                "partition_by": "patch",
                "primary_key": ["match_id"],
                "files": _collect_partitioned(data_dir / "matches"),
            },
            "participants": {
                "category": "fact",
                "partition_by": "patch",
                "primary_key": ["match_id", "puuid"],
                "files": _collect_partitioned(data_dir / "participants"),
            },
            "summoners": {
                "category": "dimension",
                "primary_key": ["puuid"],
                "files": summ_files,
            },
        },
    }

    tmp_manifest = manifest_path.with_suffix(".tmp")
    with open(tmp_manifest, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, sort_keys=True)
    tmp_manifest.replace(manifest_path)


def _upsert_partition(
    patch_dir: Path,
    new_df: pd.DataFrame,
    schema: pa.Schema,
    pk_cols: List[str],
    sort_cols: List[str],
    is_matches: bool = False,
) -> None:
    """Merge *new_df* into a single sorted Parquet file (data.parquet) for a patch."""
    patch_dir.mkdir(parents=True, exist_ok=True)
    existing_files = sorted(patch_dir.glob("*.parquet"))
    frames = [pq.read_table(fp).to_pandas() for fp in existing_files]
    frames.append(new_df)

    combined = (
        pd.concat(frames, ignore_index=True)
        .drop_duplicates(subset=pk_cols, keep="last")
        .sort_values(sort_cols)
        .reset_index(drop=True)
    )
    if is_matches:
        combined["game_creation"] = pd.to_datetime(combined["game_creation"], utc=True).dt.floor("ms")
        combined["ingested_at"] = pd.to_datetime(combined["ingested_at"], utc=True).dt.floor("ms")

    out_path = patch_dir / "data.parquet"
    _write_parquet(combined, out_path, schema)

    for fp in existing_files:
        if fp != out_path:
            fp.unlink()


def write_parquet(
    matches_df: pd.DataFrame,
    participants_df: pd.DataFrame,
    summoners_df: pd.DataFrame,
    base_dir: Path,
) -> int:
    """Write the three DataFrames to the repository ``data/`` layout.

    Deduplicates against existing matches, merges into one sorted Parquet file
    per patch for ``matches`` and ``participants``, and upserts
    ``summoners.parquet`` by ``puuid``. Returns the number of new matches written.
    """
    (base_dir / "data" / "matches").mkdir(parents=True, exist_ok=True)
    (base_dir / "data" / "participants").mkdir(parents=True, exist_ok=True)

    existing_ids = get_existing_match_ids(base_dir)

    if not matches_df.empty:
        matches_df = matches_df[~matches_df["match_id"].isin(existing_ids)].drop_duplicates(
            subset=["match_id"], keep="first"
        )
    if not participants_df.empty:
        participants_df = participants_df[~participants_df["match_id"].isin(existing_ids)].drop_duplicates(
            subset=["match_id", "puuid"], keep="first"
        )

    if matches_df.empty:
        return 0

    # ---- matches (one file per patch) -----------------------------
    for patch, grp in matches_df.groupby("patch"):
        patch_dir = base_dir / "data" / "matches" / f"patch={patch}"
        _upsert_partition(
            patch_dir,
            grp,
            MATCHES_SCHEMA,
            pk_cols=["match_id"],
            sort_cols=["game_creation", "match_id"],
            is_matches=True,
        )

    # ---- participants (one file per patch) ------------------------
    for patch, grp in participants_df.groupby("patch"):
        patch_dir = base_dir / "data" / "participants" / f"patch={patch}"
        _upsert_partition(
            patch_dir,
            grp,
            PARTICIPANTS_SCHEMA,
            pk_cols=["match_id", "puuid"],
            sort_cols=["champ_id", "game_date", "match_id"],
        )

    # ---- summoners (single file, upsert by puuid) ----------------
    summ_path = base_dir / "data" / "summoners.parquet"
    if summ_path.is_file():
        existing_summ = pq.read_table(summ_path).to_pandas()
        combined_summ = pd.concat([existing_summ, summoners_df], ignore_index=True)
    else:
        combined_summ = summoners_df

    combined_summ = (
        combined_summ.sort_values("updated_at", na_position="first")
        .drop_duplicates(subset=["puuid"], keep="last")
        .reset_index(drop=True)
    )
    combined_summ["updated_at"] = pd.to_datetime(combined_summ["updated_at"], utc=True).dt.floor("ms")
    _write_parquet(combined_summ, summ_path, SUMMONERS_SCHEMA)

    # ---- manifest.json -------------------------------------------
    _update_manifest(base_dir)

    return len(matches_df)


# ------------------------------------------------------------------
# Public helpers used by server/injestion.py
# ------------------------------------------------------------------
def ingest_matches(match_jsons: Iterable[Dict[str, Any]], repo_root: str = "..") -> int:
    """Transform and write a batch of match JSONs to Parquet.

    Returns the number of new matches written.
    """
    m_frames: List[pd.DataFrame] = []
    p_frames: List[pd.DataFrame] = []
    s_frames: List[pd.DataFrame] = []

    for mj in match_jsons:
        m_df, p_df, s_df = build_rows(mj)
        m_frames.append(m_df)
        p_frames.append(p_df)
        s_frames.append(s_df)

    if not m_frames:
        return 0

    all_m = pd.concat(m_frames, ignore_index=True)
    all_p = pd.concat(p_frames, ignore_index=True)
    all_s = pd.concat(s_frames, ignore_index=True)
    return write_parquet(all_m, all_p, all_s, Path(repo_root))


def ingest_match(match_json: Dict[str, Any], repo_root: str = "..") -> int:
    """Entry point for a single match JSON from ``server/injestion.py``."""
    return ingest_matches([match_json], repo_root=repo_root)


def compact_patches(base_dir: Path) -> None:
    """Compact each patch partition in matches and participants into one sorted Parquet file."""
    data_dir = base_dir / "data"
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")

    specs = [
        ("matches", MATCHES_SCHEMA, ["match_id"], ["game_creation", "match_id"]),
        ("participants", PARTICIPANTS_SCHEMA, ["match_id", "puuid"], ["champ_id", "game_date", "match_id"]),
    ]

    for table_name, schema, pk_cols, sort_cols in specs:
        table_dir = data_dir / table_name
        if not table_dir.exists():
            continue

        for patch_dir in sorted(table_dir.glob("patch=*")):
            if not patch_dir.is_dir():
                continue
            part_files = sorted(patch_dir.glob("*.parquet"))
            if len(part_files) <= 1:
                continue

            frames = [pq.read_table(fp).to_pandas() for fp in part_files]
            combined = pd.concat(frames, ignore_index=True)
            combined = (
                combined.drop_duplicates(subset=pk_cols, keep="last")
                .sort_values(sort_cols)
                .reset_index(drop=True)
            )
            if table_name == "matches":
                combined["game_creation"] = pd.to_datetime(combined["game_creation"], utc=True).dt.floor("ms")
                combined["ingested_at"] = pd.to_datetime(combined["ingested_at"], utc=True).dt.floor("ms")

            out_name = f"part-{stamp}-{uuid.uuid4().hex[:8]}.parquet"
            out_path = patch_dir / out_name
            _write_parquet(combined, out_path, schema)

            for fp in part_files:
                fp.unlink()

    _update_manifest(base_dir)


# ------------------------------------------------------------------
# Simple CLI for ad-hoc testing
# ------------------------------------------------------------------
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Convert Riot match JSON file(s) to Parquet.")
    parser.add_argument("json_paths", nargs="*", help="Path(s) to raw match JSON files or directories")
    parser.add_argument("--repo", default="..", help="Root of the git repo (default: parent of server folder)")
    parser.add_argument("--compact", action="store_true", help="Compact each patch partition into one file")
    args = parser.parse_args()

    if args.compact:
        compact_patches(Path(args.repo))
        print(f"Compacted patch partitions under {Path(args.repo) / 'data'}")
    elif args.json_paths:
        loaded: List[Dict[str, Any]] = []
        for raw_arg in args.json_paths:
            p = Path(raw_arg)
            files = sorted(p.glob("*.json")) if p.is_dir() else [p]
            for fp in files:
                with open(fp, "r", encoding="utf-8") as f:
                    loaded.append(json.load(f))

        written = ingest_matches(loaded, repo_root=args.repo)
        print(f"Wrote {written} new match(es) under {Path(args.repo) / 'data'}")
    else:
        parser.error("Provide json_paths or --compact")
