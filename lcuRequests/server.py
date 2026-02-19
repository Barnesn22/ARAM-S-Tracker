from flask import Flask, jsonify, request
from champ_select import build_snapshot  # your code above
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route("/api/champ-select")
def champ_select():
    picks, bench = build_snapshot()
    if picks is None:
        return jsonify({"error": "No champ select session"}), 404
    return jsonify({"picks": picks, "bench": bench})

if __name__ == "__main__":
    app.run(port=5000)

