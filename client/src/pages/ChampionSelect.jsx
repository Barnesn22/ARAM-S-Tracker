import { useState, version, useEffect } from "react";
import { supabase } from '../supabaseClient'

export default function ChampionSelect({ completedChamps, champions, idToNameMap, version, champByKey }) {
  const [picks, setPicks] = useState([]);
  const [bench, setBench] = useState([]);
  const [inChampSelect, setInChampSelect] = useState(false);
  const [winrates, setWinrates] = useState([])

  useEffect(() => {
    const fetchStats = async () => {
      const { data, error } = await supabase
        .from('champion_stats')  // your materialized view
        .select('*')
        .order('winrate', { ascending: false }) // optional sort

      if (error) {
        console.error('Error fetching champion stats:', error)
      } else {
        setWinrates(data)
      }
    }

    fetchStats()
  }, [])
  
  const getChampSelect = async () => {
    try {
      const phase = await window.electronAPI.getGamePhase();
       

      if (phase !== "ChampSelect") {
        setPicks([]);
        setBench([]);
        setInChampSelect(false);
        return;
      }

      setInChampSelect(true);

      const data = await window.electronAPI.getChampSelect();
      const bench = data["benchChampions"];
      const picks = data["myTeam"];

      const benchChamps = bench.map((b) => champByKey[b["championId"]] || null);
      setBench(benchChamps);

      // Map picks: convert championId → champ object + keep Summoner name
      const teamPicks = picks.map((p) => ({
        Summoner: p["gameName"],
        champ: champByKey[p["championId"]] || null,
      }));
      setPicks(teamPicks);

    } catch (err) {
      console.error(err);
    } finally {
    }
  };

  const getWinrate = (champId) => {
    console.log(champId)
    console.log(winrates)
    const champ = winrates.find(c => {return c.champ_id === Number(champId)});
    console.log(champ)
    return champ ? champ.winrate : 0; // default 0 if not found
  }

  useEffect(() => {
    getChampSelect();
    const interval = setInterval(getChampSelect, 2000); // then every 2 seconds
    return () => clearInterval(interval); // cleanup on unmount
  }, []);

  return (
    <div
      style={{
        padding: "20px",
        color: "#f0f0f0",
        backgroundColor: "#1e1e2f",
      }}
    >
      {/* Centered button */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
        {!inChampSelect && (
          <p style={{ textAlign: "center", color: "#f44336", fontWeight: "bold", margin: "20px 0" }}>
            Not in Champ Select
          </p>
        )}
      </div>

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
          {bench.map((champ) => {
            if (!champ) return null;

            const completed = completedChamps[champ.id] === true;
            const winrate = getWinrate(champ.key);

            return (
              <div
                key={idToNameMap[champ.id]}
                style={{
                  width: "100px",
                  height: "120px", // extra space for winrate text
                  borderRadius: "10px",
                  overflow: "hidden",
                  border: completed ? "3px solid #4caf50" : "3px solid #555",
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
                title={`${champ.name} - Winrate: ${(winrate * 100).toFixed(2)}%`}
              >
                <img
                  src={champ.image}
                  alt={champ.name}
                  style={{ width: "100%", height: "100px", objectFit: "cover" }}
                />
                <span
                  style={{
                    marginTop: "4px",
                    fontSize: "14px",
                    color: "#f0f0f0",
                    fontWeight: "bold",
                  }}
                >
                  {(winrate * 100).toFixed(2)}%
                </span>
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
            // Use default champ object if p.champ is null
            const champ = p.champ || {
              id: -1,
              name: "Unknown",
              image: "/default-champ.png", // <-- put your default image path here
            };

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
