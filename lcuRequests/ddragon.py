import requests
from PIL import Image, ImageTk
from io import BytesIO
import threading
from concurrent.futures import ThreadPoolExecutor

def get_latest_patch():
    r = requests.get("https://ddragon.leagueoflegends.com/api/versions.json")
    return r.json()[0]

def get_champ_dict():
    patch = get_latest_patch()
    r = requests.get(f"https://ddragon.leagueoflegends.com/cdn/{patch}/data/en_US/champion.json")
    data = r.json()["data"]
    return {int(champ["key"]): champ["name"] for champ in data.values()}

champion_icons = {}
loaded = False

def preload_champion_icons(champions):
    ICON_SIZE = 115
    global loaded
    if loaded:
        return

    def load_icon(name):
        try:
            url = f"https://ddragon.leagueoflegends.com/cdn/15.20.1/img/champion/{name}.png"
            resp = requests.get(url, timeout=5)
            resp.raise_for_status()
            img = Image.open(BytesIO(resp.content)).resize((ICON_SIZE, ICON_SIZE))
            return name, img
        except Exception as e:
            print(f"Error loading {name}: {e}")
            return name, None

    def load_all():
        global loaded
        with ThreadPoolExecutor(max_workers=30) as executor:
            for name, img in executor.map(load_icon, champions):
                if img:
                    champion_icons[name] = img
        loaded = True
        print("Done Loading")

    threading.Thread(target=load_all, daemon=True).start()

def get_champion_icon(name):
    pil_image = champion_icons.get(name)
    if pil_image is None:
        return None  # or return a placeholder image
    return ImageTk.PhotoImage(pil_image)