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
      window.electronAPI.saveMissions(newCompleted)

    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex flex-col p-5 items-center h-1/1">
      <div className="flex flex-col h-1/1 max-w-1200 m-auto">
        <h1 className="text-center">ARAM S Tracker</h1>

        <div className="text-center my-2">
          <button className="!bg-black mb-2" onClick={syncFromLeague} disabled={syncing}>
            {syncing ? "Syncing..." : "Sync From League"}
          </button>
        </div>

        {/* Search bar */}
        <input
          type="text"
          placeholder="Search champions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg p-2 mx-4 bg-secondary border border-accent"
        />

        {/* Scrollable grid */}
        <div className="p-4 m-4  rounded-lg flex flex-col overflow-y-auto custom-scrollbar bg-secondary border border-accent">
          <div className="grid grid-cols-7 gap-4">
            {filteredChamps.map((champ) => {
              const isCompleted = completedChamps[champ.id] === true;

              return (
                <div
                  className="relative text-center rounded-lg cursor-pointer"
                  key={champ.name}
                  style={{
                    filter: isCompleted ? "grayscale(100%)" : "none",
                    opacity: isCompleted ? 0.4 : 1,
                  }}
                  onClick={() => toggleChampion(champ)}
                >
                  <img src={champ.image} alt={champ.name} className="rounded-lg w-1/1 aspect-square" />
                  {isCompleted && <div className="bg-[rgba(255,152,0,0.85)] font-bold text-[10px] rounded-md text-primary absolute top-2/5 left-1/2 -translate-1/2 py-1 px-2">Completed</div>}
                  <p className="text-xs mt-1">{champ.name}</p>
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