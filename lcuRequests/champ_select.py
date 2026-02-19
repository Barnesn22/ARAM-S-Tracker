import base64
import requests
import urllib3
import subprocess
import sys
import re

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)



def get_lcu_credentials():
    if sys.platform.startswith("win"):
        # Windows: use PowerShell
        cmd = [
            "powershell",
            "Get-CimInstance Win32_Process | "
            "Where-Object { $_.Name -eq 'LeagueClientUx.exe' } | "
            "Select-Object -ExpandProperty CommandLine"
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        output = result.stdout
    else:
        # macOS / Linux
        cmd = ["ps", "-A"]
        result = subprocess.run(cmd, capture_output=True, text=True)
        output = "\n".join([line for line in result.stdout.splitlines() if "LeagueClientUx" in line])

    if not output:
        raise RuntimeError("League client is not running")

    port_match = re.search(r"--app-port=(\d+)", output)
    token_match = re.search(r"--remoting-auth-token=([\w-]+)", output)

    if not port_match or not token_match:
        raise RuntimeError("Could not extract LCU credentials")

    return int(port_match.group(1)), token_match.group(1)

def get_champ_select():
    PORT, TOKEN = get_lcu_credentials()
    base_url = f"https://127.0.0.1:{PORT}"
    auth = base64.b64encode(f"riot:{TOKEN}".encode()).decode()
    headers = {"Authorization": f"Basic {auth}"}
    try:
        r = requests.get(f"{base_url}/lol-champ-select/v1/session", headers=headers, verify=False)
        if r.status_code != 200:
            print(r)
            return None
        return r.json()
    except:
        return None

DD_CHAMP_URL = "http://ddragon.leagueoflegends.com/cdn/13.23.1/data/en_US/champion.json"

resp = requests.get(DD_CHAMP_URL).json()
champ_map = {}
for champ_name, champ_data in resp["data"].items():
    champ_id = int(champ_data["key"])
    champ_map[champ_id] = champ_name

def get_bench(session):
    return [champ['championId'] for champ in session['benchChampions']]

def build_snapshot():
    session = get_champ_select()
    if not session:
        return None, None

    picks = []
    for player in session.get("myTeam", []):
        champ_id = player.get("championId", 0)
        champ_name = champ_map.get(champ_id, "None") if champ_id != 0 else "None"
        picks.append({
            "Summoner": player.get("gameName", "Unknown"),
            "Champion": champ_name
        })

    bench_ids = get_bench(session)
    bench_names = [champ_map.get(c, f"Unknown({c})") for c in bench_ids]

    return picks, bench_names

if __name__ == "__main__":
    print(build_snapshot())