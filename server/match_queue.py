import os, json

# Path to the JSON file that stores the queue of match IDs.
QUEUE_FILE = os.path.join(os.path.dirname(__file__), "match_queue.json")

def _load_queue() -> list:
    """Load the queue from disk. Returns an empty list if the file does not exist."""
    if not os.path.exists(QUEUE_FILE):
        return []
    with open(QUEUE_FILE, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
            if isinstance(data, list):
                return data
        except json.JSONDecodeError:
            pass
    return []

def _save_queue(queue: list) -> None:
    """Write the queue back to disk."""
    with open(QUEUE_FILE, "w", encoding="utf-8") as f:
        json.dump(queue, f, indent=2)

def pop_next_match_id() -> str | None:
    """Remove and return the first match ID from the queue, or ``None`` if empty."""
    queue = _load_queue()
    if not queue:
        return None
    match_id = queue.pop(0)
    _save_queue(queue)
    return match_id

def add_match_ids(match_ids: list) -> None:
    """Add new match IDs to the end of the queue, preserving order and avoiding duplicates."""
    queue = _load_queue()
    seen = set(queue)
    for mid in match_ids:
        if mid not in seen:
            queue.append(mid)
            seen.add(mid)
    _save_queue(queue)


def get_queue_length() -> int:
    """Return the number of match IDs currently in the queue."""
    return len(_load_queue())
