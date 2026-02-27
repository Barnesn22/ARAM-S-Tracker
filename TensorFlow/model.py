import requests
from supabase import create_client
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.linear_model import LinearRegression
from xgboost import XGBClassifier
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType
from sklearn.metrics import roc_auc_score
from sklearn.decomposition import TruncatedSVD
from sklearn.preprocessing import StandardScaler

# Get latest Data Dragon version
versions_url = "https://ddragon.leagueoflegends.com/api/versions.json"
latest_version = requests.get(versions_url).json()[0]

# Fetch champion data
champ_url = f"https://ddragon.leagueoflegends.com/cdn/{latest_version}/data/en_US/champion.json"
champ_data = requests.get(champ_url).json()["data"]

# Map champion key (int) → index
champ_list = [int(champ_data[name]["key"]) for name in champ_data]
champ_list.sort()
champ_to_index = {champ_id: idx for idx, champ_id in enumerate(champ_list)}
NUM_CHAMPS = len(champ_list)


url = "https://swffwjjveghovalezabk.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3ZmZ3amp2ZWdob3ZhbGV6YWJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzgzNTAsImV4cCI6MjA4NzMxNDM1MH0.CNqC6V41b1y8mVfiyww9JfImwdzT4BvycMhyDIgjN74"
supabase = create_client(url, key)

all_rows = []
page_size = 1000
start = 0

while True:
    response = (
        supabase
        .table("team_matches")
        .select("*")
        .range(start, start + page_size - 1)
        .execute()
    )

    data = response.data

    if not data:
        break
    '''if len(all_rows) > 5000:
        break'''

    all_rows.extend(data)
    start += page_size

    print(f"Fetched {len(all_rows)} rows so far...")
print(f"fetched: {len(all_rows)}")
df = pd.DataFrame(all_rows)

# Convert win to boolean
df['win'] = df['win'].astype(bool)


# Convert champion IDs to indices in champ_to_index
def champs_to_indices(champs):
    return [champ_to_index[int(c)] for c in champs]

df['champ_indices'] = df['champs'].apply(champs_to_indices)

all_champs = sorted({c for row in df['champ_indices'] for c in row})

response = (
    supabase
    .table("champion_stats")
    .select("*")
    .execute()
)
data = response.data
champ_winrate = {champ_to_index[int(c["champ_id"])]: c["winrate"] for c in data}


X = np.array(df['champ_indices'].tolist())  # shape (num_teams, 5)
X_winrate = np.array([[champ_winrate[c] for c in row] for row in df['champ_indices']])
y = df['win'].astype(int).values

def team_features(champ_list):
    vec = np.zeros(NUM_CHAMPS)
    for champ in champ_list:
        vec[champ] = champ_winrate[champ] # use winrate instead of 1
    return vec

X_multi = np.vstack(df['champ_indices'].apply(team_features))

EMBED_DIM = 16  # tuneable

'''svd = TruncatedSVD(n_components=EMBED_DIM, random_state=42)
X_embed = svd.fit_transform(X_multi)'''

X_train, X_test, y_train, y_test = train_test_split(
    X_multi, y, test_size=0.2, random_state=42, stratify=y
)

def baseline_predict(team):
    return np.mean([champ_winrate[c] for c in team])

gbc = GradientBoostingClassifier()
gbc.fit(X_train, y_train)

xgb = XGBClassifier(
    n_estimators=300,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    eval_metric="logloss"
)

xgb.fit(X_train, y_train)

lrg = LinearRegression()
lrg.fit(X_train, y_train)


print("SKLearn GBoost: ", roc_auc_score(y_test, gbc.predict_proba(X_test)[:,1]))
print("XGB: ", roc_auc_score(y_test, xgb.predict_proba(X_test)[:,1]))
print("Linear Regression: ", roc_auc_score(y_test, lrg.predict(X_test)))
print("Baseline: ", roc_auc_score(y, np.array([
    baseline_predict(team)
    for team in X
])))


'''initial_type = [('float_input', FloatTensorType([None, NUM_CHAMPS]))]



onnx_model = convert_sklearn(gbc, initial_types=initial_type)

with open("champ_model.onnx", "wb") as f:
    f.write(onnx_model.SerializeToString())

import onnxruntime as ort

session = ort.InferenceSession("champ_model.onnx")

input_name = session.get_inputs()[0].name

pred = session.run(None, {
    input_name: X_test[:1].astype(np.float32)
})

print(pred)'''