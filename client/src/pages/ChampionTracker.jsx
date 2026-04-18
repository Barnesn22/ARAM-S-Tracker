import { useEffect, useState } from "react";

function ChampionTracker({completedChamps, setCompleted, champions, version, champByKey}) {
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false)
  const [selectedRoles, setSelectedRoles] = useState([]);

  const toggleChampion = (champ) => {
    const updated = { ...completedChamps };
    updated[champ.id] = !updated[champ.id];
    setCompleted(updated);

    // Save to file
    window.electronAPI.saveMissions(updated);
  };

  const filteredChamps = champions.filter((champ) => {
    const matchesSearch = champ.name
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesRole =
      selectedRoles.length === 0 ||
      champ.tags?.some((tag) => selectedRoles.includes(tag));

    return matchesSearch && matchesRole;
  });

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
  const total = champions.length;
  const completed = champions.filter(
    champ => completedChamps[champ.id]
  ).length;

  const percent = total > 0 ? (completed / total) * 100 : 0;

  const roleStats = {};
  champions.forEach(champ => {
    champ.tags.forEach(role => {
      if (!roleStats[role]) {
        roleStats[role] = { total: 0, completed: 0 };
      }

      roleStats[role].total += 1;

      if (completedChamps[champ.id]) {
        roleStats[role].completed += 1;
      }
    });
  });

  return (
    <div className="flex p-5 h-full gap-4 items-start">
      <div className="w-1/5 flex flex-col bg-secondary border border-accent rounded-lg p-4">
        <h2 className="text-xl font-bold mb-4">Progress Yay Update</h2>

          {/* Overall */}
          <div className="mb-4">
            <p className="text-lg mb-1">
              {completed} / {total} completed
            </p>

            <div className="w-full bg-black rounded-full h-3">
              <div
                className="bg-orange-400 h-3 rounded-full"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {/* Role Breakdown */}
          <div>
            <h3 className="text-lg font-semibold mb-2">By Role</h3>

            <div className="flex flex-col gap-5">
              {Object.entries(roleStats).map(([role, stats]) => {
                const pct = (stats.completed / stats.total) * 100;
                const isSelected = selectedRoles.includes(role);

                return (
                  <div
                    key={role}
                    className={`cursor-pointer p-1 rounded ${
                      isSelected ? "bg-accent" : "hover:bg-black/30"
                    }`}
                    onClick={() => {
                      setSelectedRoles(prev =>
                        prev.includes(role)
                          ? prev.filter(r => r !== role) // remove
                          : [...prev, role] // add
                      );
                    }}
                  >
                    <div className="flex justify-between text-xs">
                      <span>{role}</span>
                      <span>{stats.completed}/{stats.total}</span>
                    </div>

                    <div className="w-full bg-black rounded-full h-2">
                      <div
                        className="bg-blue-400 h-2 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      <div className="flex flex-col h-full max-w-1200 m-auto">
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