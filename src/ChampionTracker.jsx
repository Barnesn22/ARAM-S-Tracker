import { useEffect, useState } from "react";

function ChampionTracker({completedChamps, setCompleted, champions, version, champByKey}) {
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false)

  const toggleChampion = (champ) => {
    const updated = { ...completedChamps };
    updated[champ.id] = !updated[champ.id];
    setCompleted(updated);

    // Save to file
    window.electronAPI.saveMissions(updated);
  };

  const filteredChamps = champions.filter((champ) =>
    champ.name.toLowerCase().includes(search.toLowerCase())
  );

  const syncFromLeague = async () => {
    try {
      setSyncing(true);

      const challengeData = await window.electronAPI.getPlayerChallenges();
      const completedKeys = challengeData[101301]["completedIds"];
      const newCompleted = {};
      Object.keys(completedChamps).forEach((id) => {
        newCompleted[id] = false;
      });

      completedKeys.forEach((key) => {
        const champ = champByKey[key];
        if (champ) {
          newCompleted[champ.id] = true;
        }
      });

      setCompleted(newCompleted)

    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setSyncing(false);
    }
  };

  //if (loading) return <h2 style={{ padding: "40px" }}>Loading Champions...</h2>;

  return (
    <div className="page">
      <div className="container">
        <h1 style={{textAlign: "center"}}>ARAM S Tracker</h1>

        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <button onClick={syncFromLeague} disabled={syncing}>
            {syncing ? "Syncing..." : "Sync From League"}
          </button>
        </div>

        {/* Search bar */}
        <input
          type="text"
          placeholder="Search champions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search"
        />

        {/* Scrollable grid */}
        <div className="scroll-container">
          <div className="grid">
            {filteredChamps.map((champ) => {
              const isCompleted = completedChamps[champ.id] === true;

              return (
                <div
                  className="card"
                  key={champ.name}
                  style={{
                    filter: isCompleted ? "grayscale(100%)" : "none",
                    opacity: isCompleted ? 0.4 : 1,
                  }}
                  onClick={() => toggleChampion(champ)}
                >
                  <img src={champ.image} alt={champ.name} className="image" />
                  {isCompleted && <div className="overlay">Completed</div>}
                  <p className="name">{champ.name}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChampionTracker;