# injestion.py – rewritten to use Parquet model instead of MySQL
# This script handles LCU authentication, a local JSON queue of match IDs,
# and writes match data to Parquet files via `injestion_to_parquet.py`.

import time
import json
import os
from datetime import datetime
from pathlib import Path
import subprocess
import platform
import re
import sys
import requests
import urllib3
import traceback
import concurrent.futures
import threading

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ---------------------------
# CONFIG
# ---------------------------
REPO_ROOT = str(Path(__file__).resolve().parents[1])
RAW_FOLDER = str(Path(REPO_ROOT) / "raw_matches")
BATCH_SIZE = 10

# Import the local queue helpers
from match_queue import pop_next_match_id, add_match_ids, get_queue_length

# Import the Parquet writer wrapper
from injestion_to_parquet import (
    get_existing_match_ids as _parquet_existing_ids,
    ingest_match as parquet_ingest_match,
    ingest_matches,
)

# ---------------------------
# RATE LIMITING (thread-safe)
# ---------------------------
class RateLimiter:
    def __init__(self, max_requests_per_second=10):
        self.max_requests_per_second = max_requests_per_second
        self.requests = []
        self.min_interval = 1.0 / max_requests_per_second
        self._lock = threading.Lock()

    def wait_if_needed(self):
        with self._lock:
            current_time = time.time()
            # purge old entries
            self.requests = [t for t in self.requests if current_time - t < 1.0]
            # enforce max per second
            if len(self.requests) >= self.max_requests_per_second:
                oldest = min(self.requests)
                sleep = 1.0 - (current_time - oldest)
                if sleep > 0:
                    time.sleep(sleep)
                    current_time = time.time()
            # enforce minimum interval between bursts
            if self.requests:
                since_last = current_time - self.requests[-1]
                if since_last < self.min_interval:
                    time.sleep(self.min_interval - since_last)
                    current_time = time.time()
            self.requests.append(current_time)

rate_limiter = RateLimiter(10)

# ---------------------------
# LCU AUTH – direct PowerShell implementation (no fallback)
# ---------------------------
def get_lcu_credentials():
    """Retrieve LCU port and auth token across Windows, macOS, and Linux."""
    system = platform.system()
    if system == "Windows":
        ps_cmd = (
            "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'LeagueClientUx.exe' } "
            "| Select-Object -ExpandProperty CommandLine"
        )
        result = subprocess.run(
            ["powershell", "-NoProfile", "-Command", ps_cmd],
            capture_output=True,
            text=True,
        )
        stdout = result.stdout.strip()
    elif system in ("Darwin", "Linux"):
        result = subprocess.run(
            "ps -A | grep LeagueClientUx",
            shell=True,
            capture_output=True,
            text=True,
        )
        stdout = result.stdout.strip()
    else:
        raise Exception(f"Unsupported OS: {system}")

    if not stdout:
        raise Exception("League client not running or process lookup produced no output.")
    port_match = re.search(r"--app-port=(\d+)", stdout)
    token_match = re.search(r"--remoting-auth-token=([\w-]+)", stdout)
    if not port_match or not token_match:
        raise Exception(f"Could not extract LCU credentials from output: {stdout!r}")
    port, token = port_match.group(1), token_match.group(1)
    print(f"Found LCU port={port}")
    return port, token

_thread_local = threading.local()


def _get_session():
    if not hasattr(_thread_local, "session"):
        s = requests.Session()
        s.verify = False
        _thread_local.session = s
    return _thread_local.session


def lcu_request(port, auth_token, endpoint):
    rate_limiter.wait_if_needed()
    url = f"https://127.0.0.1:{port}{endpoint}"
    response = _get_session().get(url, auth=("riot", auth_token))
    response.raise_for_status()
    return response.json()

# ---------------------------
# QUEUE HELPERS – thin wrappers around match_queue module
# ---------------------------
def get_next_match_id():
    """Retrieve the next match ID from the local JSON queue."""
    return pop_next_match_id()


def insert_new_match_ids(match_ids):
    """Append new match IDs to the queue, avoiding duplicates."""
    if match_ids:
        add_match_ids(list(match_ids))


def get_existing_match_ids():
    """Get all existing match IDs from Parquet files."""
    return _parquet_existing_ids(Path(REPO_ROOT))


def get_games_count():
    """Get count of games in match_queue."""
    return get_queue_length()


# ---------------------------
# TRANSFORM + LOAD – forwards to Parquet writer
# ---------------------------
def transform_and_load(match_jsons):
    """Convert raw match JSON(s) into Parquet files via the writer module."""
    if isinstance(match_jsons, dict):
        return parquet_ingest_match(match_jsons, repo_root=REPO_ROOT)
    return ingest_matches(match_jsons, repo_root=REPO_ROOT)


# ---------------------------
# MAIN LOOP – retains mysql_injestion.py logic using the Parquet pathway
# ---------------------------
def main():
    os.makedirs(RAW_FOLDER, exist_ok=True)
    print("Getting LCU credentials…")
    port, auth_token = get_lcu_credentials()
    print("Starting ingestion loop…")

    pending_batch = []
    known_match_ids = get_existing_match_ids()

    def flush_batch():
        if pending_batch:
            t0 = time.perf_counter()
            written = transform_and_load(pending_batch)
            print(f"[TIMING] Flushed {written} new match(es) to Parquet in {time.perf_counter() - t0:.3f}s")
            pending_batch.clear()

    try:
        while True:
            try:
                t_loop = time.perf_counter()
                t0 = time.perf_counter()
                match_id = get_next_match_id()
                t_pop = time.perf_counter() - t0
                if not match_id:
                    flush_batch()
                    print("Queue empty. Sleeping…")
                    time.sleep(1)
                    continue

                if str(match_id) in known_match_ids:
                    print(f"[SKIP] Match {match_id} already known (pop={t_pop:.3f}s)")
                    continue

                print(f"Processing match {match_id} (pop={t_pop:.3f}s)")
                t0 = time.perf_counter()
                match_json = lcu_request(port, auth_token, f"/lol-match-history/v1/games/{match_id}")
                t_match_req = time.perf_counter() - t0
                print(f"[TIMING] Fetch match {match_id}: {t_match_req:.3f}s")

                if match_json.get("queueId") != 2400:
                    print("Not Mayhem, skipping")
                    continue

                t0 = time.perf_counter()
                queue_count = get_games_count()
                get_histories = queue_count < 1000
                t_qcount = time.perf_counter() - t0

                # Persist raw JSON for debugging / audit
                t0 = time.perf_counter()
                filepath = os.path.join(RAW_FOLDER, f"{match_id}_{datetime.now().timestamp()}.json")
                with open(filepath, "w", encoding="utf-8") as f:
                    json.dump(match_json, f)
                t_raw = time.perf_counter() - t0
                print(f"[TIMING] queue_count={queue_count} ({t_qcount:.3f}s), save_raw={t_raw:.3f}s")

                # Queue into batch & flush periodically
                known_match_ids.add(str(match_json["gameId"]))
                pending_batch.append(match_json)
                if len(pending_batch) >= BATCH_SIZE:
                    flush_batch()

                if not get_histories:
                    print(f"[TIMING] Total match {match_id}: {time.perf_counter() - t_loop:.3f}s (histories skipped)")
                    continue

                # Pull histories for a subset of participants sequentially
                t_hist_total = time.perf_counter()
                new_match_ids = set()
                for i, p in enumerate(match_json.get("participantIdentities", [])):
                    if i % 2 != 0:
                        continue
                    puuid = p["player"]["puuid"]
                    t0 = time.perf_counter()
                    try:
                        history = lcu_request(
                            port, auth_token, f"/lol-match-history/v1/products/lol/{puuid}/matches"
                        )
                        added = 0
                        for m in history.get("games", {}).get("games", []):
                            mid = str(m.get("gameId"))
                            if mid not in known_match_ids:
                                new_match_ids.add(mid)
                                added += 1
                        print(f"[TIMING] History {puuid[:8]}…: {time.perf_counter() - t0:.3f}s (+{added} new)")
                    except Exception as e:
                        print(f"Error fetching history for {puuid} ({time.perf_counter() - t0:.3f}s): {e}")

                t0 = time.perf_counter()
                insert_new_match_ids(new_match_ids)
                t_insert = time.perf_counter() - t0
                print(
                    f"[TIMING] Histories total={time.perf_counter() - t_hist_total:.3f}s, "
                    f"queue_insert({len(new_match_ids)})={t_insert:.3f}s, "
                    f"match_total={time.perf_counter() - t_loop:.3f}s"
                )

            except Exception as e:
                print("Error in main loop:", e)
                traceback.print_exc()
                time.sleep(5)
    finally:
        flush_batch()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nShutting down…")
