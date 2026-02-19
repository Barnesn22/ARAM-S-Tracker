import { useState, version } from "react";

export default function ChampionSelect({ completedChamps, champions, idToNameMap, version, champByKey }) {
  const [picks, setPicks] = useState([]);
  const [bench, setBench] = useState([]);
  const [loading, setLoading] = useState(false);
  const DD_IMG_URL = `http://ddragon.leagueoflegends.com/cdn/${version}/img/champion/`;
  

  const getChampSelect = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/champ-select");
      if (!res.ok) throw new Error("No session found");
      const data = await res.json();
      setPicks(data.picks);
      setBench(data.bench);
    } catch (err) {
      console.error(err);
      alert("Could not fetch champ select session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: "20px",
        color: "#f0f0f0",
        backgroundColor: "#1e1e2f",
        minHeight: "100vh",
      }}
    >
      {/* Centered button */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
        <button onClick={getChampSelect} style={{ padding: "10px 20px" }}>
          Get Current Champ Select
        </button>
      </div>

      {loading && <p style={{ textAlign: "center" }}>Loading...</p>}

      {/* Bench champions across the top */}
      {bench.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "20px",
            overflowX: "auto",
            paddingBottom: "10px",
          }}
        >
          {bench.map((champ_key) => {
            const champ = champByKey[champ_key]
            console.log(champ)
            if (!champ) return null; // skip undefined
            const completed = completedChamps[champ.id] === true;
            return (
              <div
                key={idToNameMap[champ.id]}
                style={{
                  width: "100px",
                  height: "100px",
                  borderRadius: "10px",
                  overflow: "hidden",
                  border: completed ? "3px solid #4caf50" : "3px solid #555",
                  flexShrink: 0,
                }}
                title={champ.name}
              >
                <img
                  src={champ.image}
                  alt={champ.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Picks along the left side */}
      {picks.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {picks.map((p) => {
            const champ = champByKey[p.Champion]
            const completed = completedChamps[champ.id] === true;
            return (
            <div
              key={p.Summoner}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                backgroundColor: "#333",
                padding: "5px 10px",
                borderRadius: "8px",
                width: "220px",
                
              }}
            >
              <img
                src={champ.image}
                alt={champ.name}
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "4px",
                  border: completed ? "3px solid #4caf50" : "3px solid #555",
                }}
              />
              <span>{p.Summoner}</span>
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
}
