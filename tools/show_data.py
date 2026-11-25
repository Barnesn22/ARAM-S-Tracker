"""Inspect Parquet tables under data/ for ARAM-S-Tracker.

Examples:
    python tools/show_data.py
    python tools/show_data.py --table participants --rows 20 --patch 16.23
    python tools/show_data.py --summary
"""

import argparse
import json
from pathlib import Path
from typing import Optional

import pandas as pd


def load_table(data_root: Path, name: str, patch: Optional[str] = None) -> tuple[pd.DataFrame, int]:
    """Load a Parquet table (or a single patch partition) into a DataFrame.

    Returns (df, file_count).
    """
    if name == "summoners":
        summ_path = data_root / "summoners.parquet"
        if not summ_path.is_file():
            return pd.DataFrame(), 0
        return pd.read_parquet(summ_path), 1

    table_dir = data_root / name
    if not table_dir.exists():
        return pd.DataFrame(), 0

    search_root = table_dir / f"patch={patch}" if patch else table_dir
    if not search_root.exists():
        return pd.DataFrame(), 0

    parts = sorted(search_root.rglob("*.parquet"))
    if not parts:
        return pd.DataFrame(), 0

    dfs = [pd.read_parquet(p) for p in parts]
    return pd.concat(dfs, ignore_index=True), len(parts)


def print_manifest_summary(data_root: Path) -> None:
    manifest_path = data_root / "manifest.json"
    if not manifest_path.is_file():
        print(f"Manifest: not found ({manifest_path})")
        return
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        print(f"Manifest generated_at: {manifest.get('generated_at', 'unknown')}")
    except Exception as exc:
        print(f"Manifest: failed to parse ({exc})")


def show_table(
    data_root: Path,
    name: str,
    rows: int,
    patch: Optional[str],
    columns: Optional[list[str]],
    summary_only: bool,
) -> None:
    df, file_count = load_table(data_root, name, patch=patch if name != "summoners" else None)
    if df.empty:
        print(f"\n=== {name.upper()} (0 rows, {file_count} file(s)) ===")
        return

    extra = ""
    if name == "matches":
        patches = sorted(df["patch"].dropna().unique().tolist()) if "patch" in df else []
        extra = f" | patches={patches}"
        if "game_creation" in df and not df["game_creation"].isna().all():
            extra += f" | range={df['game_creation'].min()} .. {df['game_creation'].max()}"
    elif name == "participants":
        extra = f" | unique_matches={df['match_id'].nunique()} | unique_champs={df['champ_id'].nunique()}"
    elif name == "summoners":
        extra = f" | unique_puuids={df['puuid'].nunique()}"

    print(f"\n=== {name.upper()} ({len(df)} rows across {file_count} file(s){extra}) ===")
    if summary_only:
        return

    if columns:
        missing = [c for c in columns if c not in df.columns]
        if missing:
            print(f"[WARN] Unknown column(s) for {name}: {missing}")
        valid = [c for c in columns if c in df.columns]
        if valid:
            df = df[valid]

    print(df.head(rows).to_string(index=False))


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect ARAM-S-Tracker Parquet data.")
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "data",
        help="Path to data directory (default: <repo>/data)",
    )
    parser.add_argument(
        "-t", "--table",
        choices=["all", "matches", "participants", "summoners"],
        default="all",
        help="Which table to display (default: all)",
    )
    parser.add_argument(
        "-n", "--rows",
        type=int,
        default=10,
        help="Number of rows to display per table (default: 10)",
    )
    parser.add_argument(
        "--patch",
        default=None,
        help="Filter partitioned tables by patch (e.g. 16.23)",
    )
    parser.add_argument(
        "-c", "--columns",
        default=None,
        help="Comma-separated list of columns to display",
    )
    parser.add_argument(
        "-s", "--summary",
        action="store_true",
        help="Show row/file counts and summary info without printing rows",
    )
    args = parser.parse_args()

    pd.set_option("display.max_columns", None)
    pd.set_option("display.width", 200)

    print(f"Data directory: {args.data_dir}")
    print_manifest_summary(args.data_dir)

    cols = [c.strip() for c in args.columns.split(",") if c.strip()] if args.columns else None
    tables = ("matches", "participants", "summoners") if args.table == "all" else (args.table,)

    for tbl in tables:
        show_table(args.data_dir, tbl, args.rows, args.patch, cols, args.summary)


if __name__ == "__main__":
    main()
