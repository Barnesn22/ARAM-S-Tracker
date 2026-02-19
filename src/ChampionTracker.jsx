import { useEffect, useState } from "react";


function ChampionTracker({completedChamps, setCompleted, champions, idToNameMap, version}) {
  const [search, setSearch] = useState("");

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

  //if (loading) return <h2 style={{ padding: "40px" }}>Loading Champions...</h2>;

  return (
    <div className="page">
      <div className="container">
        <h1 style={{textAlign: "center"}}>ARAM S Tracker</h1>

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