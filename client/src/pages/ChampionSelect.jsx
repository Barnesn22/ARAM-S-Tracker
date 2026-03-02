import { useState, version, useEffect } from "react";
import { supabase } from '../supabaseClient'

export default function ChampionSelect({ completedChamps, champions, idToNameMap, version, champByKey }) {
  const [picks, setPicks] = useState([]);
  const [bench, setBench] = useState([]);
  const [inChampSelect, setInChampSelect] = useState(false);
  const [winrates, setWinrates] = useState([]);
  const [initialSelection, setInitialSelection] = useState(false);
  const [options, setOptions] = useState([]);

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
       

      if (phase !== "ChampSelect") {5
        setPicks([]);
        setBench([]);
        setInChampSelect(false);
        setInitialSelection(false);
        return;
      }

      setInChampSelect(true);

      const mySelection = await window.electronAPI.getMySelection();
      console.log("Selection: ", mySelection["championId"])
      if (mySelection["championId"] == 0) {
        setInitialSelection(true);
        const response = await window.electronAPI.getInitialChamps();
        setOptions(response)
      }
      else {
        setInitialSelection(false)
      }
      console.log(options)

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
    const champ = winrates.find(c => {return c.champ_id === Number(champId)});
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
      {inChampSelect && (
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "20px",
            overflowX: "auto",
            paddingBottom: "10px",
            justifyContent: "center"
          }}
        >
          {Array.from({ length: 10 }).map((_, index) => {
            const champ = bench[index]; // may be undefined

            const isEmpty = !champ;

            const completed = champ
              ? completedChamps[champ.id] === true
              : false;

            const winrate = champ
              ? getWinrate(champ.key) || 0
              : 0;

            return (
              <div
                key={index}
                style={{
                  width: "100px",
                  height: "120px",
                  borderRadius: "10px",
                  overflow: "hidden",
                  border: completed ? "3px solid #4caf50" : "3px solid #555",
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  backgroundColor: "#2a2a3a",
                }}
                title={
                  champ
                    ? `${champ.name} - Winrate: ${(winrate * 100).toFixed(2)}%`
                    : "Empty slot"
                }
              >
                <img
                  src={
                    champ
                      ? champ.image
                      : "../assets/ChampionSquare.webp" // your default image
                  }
                  alt={champ ? champ.name : "Empty"}
                  style={{
                    width: "100%",
                    height: "100px",
                    objectFit: "cover",
                    opacity: isEmpty ? 0.4 : 1, // slightly faded empty slots
                  }}
                />

                <span
                  style={{
                    marginTop: "4px",
                    fontSize: "14px",
                    color: "#f0f0f0",
                    fontWeight: "bold",
                  }}
                >
                  {champ ? `${(winrate * 100).toFixed(2)}%` : "--"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "flex-start", // ensures same top alignment
          gap: "40px",
          marginTop: "20px",
          width: "90%",
          height: "100%",
        }}
      >
        {/* Picks along the left side */}
        {inChampSelect && (
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
                image: "../assets/ChampionSquare.webp", 
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

        {/* MIDDLE – Champion Options */}
        {initialSelection && (
          <div
            style={{
              display: "flex",
              flex: 1,
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "15px",
              }}
            >
              {options.map((c) => {
                const champ = champByKey[c];
                const winrate = getWinrate(champ.key) || 0;
                const completed = completedChamps[champ.id] === true;

                return (
                  <div
                    key={champ.id}
                    style={{
                      borderRadius: "10px",
                      overflow: "hidden",
                      border: completed ? "3px solid #4caf50" : "3px solid #555",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${champ.id}_0.jpg`}
                      alt={champ.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        flexGrow: 1,
                        objectFit: "contain",
                      }}
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
          </div>
        )}
      </div>
    </div>
  );
}
