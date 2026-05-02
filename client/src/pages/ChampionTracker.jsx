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
    <div className="min-h-full bg-gradient-to-br from-[#0f0f23] to-[#1a1a2e] p-5">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold text-white">ARAM S Tracker</h1>
        </div>

        <div className="flex gap-6 h-full">
          <div className="w-80 flex-shrink-0">
            <div className="bg-[#1a1a2e]/50 backdrop-blur-sm rounded-xl shadow-2xl border border-[#2a2a3a] p-4">
              <h2 className="text-lg font-bold text-white mb-4">Progress Overview</h2>

          {/* Overall */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-semibold text-sm">Overall Progress</span>
              <span className="text-orange-400 font-bold text-sm">{percent.toFixed(1)}%</span>
            </div>
            <p className="text-gray-300 text-xs mb-2">
              {completed} / {total} completed
            </p>

            <div className="w-full bg-[#2a2a3a] rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-orange-500 to-orange-400 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {/* Role Breakdown */}
          <div>
            <h3 className="text-base font-semibold text-white mb-3">Filter by Role</h3>

            <div className="flex flex-col gap-2">
              {Object.entries(roleStats).map(([role, stats]) => {
                const pct = (stats.completed / stats.total) * 100;
                const isSelected = selectedRoles.includes(role);

                return (
                  <div
                    key={role}
                    className={`cursor-pointer p-2 rounded-lg transition-all duration-200 ${
                      isSelected 
                        ? "bg-[#2a2a3a] border border-orange-400" 
                        : "bg-[#1a1a2e]/50 hover:bg-[#2a2a3a] border border-transparent"
                    }`}
                    onClick={() => {
                      setSelectedRoles(prev =>
                        prev.includes(role)
                          ? prev.filter(r => r !== role) // remove
                          : [...prev, role] // add
                      );
                    }}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-white font-medium text-sm">{role}</span>
                      <span className="text-gray-300 text-xs">{stats.completed}/{stats.total}</span>
                    </div>

                    <div className="w-full bg-[#0f0f23] rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-400 h-1.5 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1">
        <div className="bg-[#1a1a2e]/50 backdrop-blur-sm rounded-xl shadow-2xl border border-[#2a2a3a] p-4">
          {/* Sync and Search Section */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <button 
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-400 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-orange-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-sm" 
              onClick={syncFromLeague} 
              disabled={syncing}
            >
              {syncing ? "Syncing..." : "Sync From League"}
            </button>

            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search champions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 bg-[#2a2a3a]/50 border border-[#3a3a4a] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-400 transition-colors duration-200 text-sm"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                🔍
              </div>
            </div>
          </div>

          {/* Champion Grid */}
          <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 280px)' }}>
            <div className="grid grid-cols-7 gap-3">
              {filteredChamps.map((champ) => {
                const isCompleted = completedChamps[champ.id] === true;

                return (
                  <div
                    className="relative text-center rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg group"
                    key={champ.name}
                    style={{
                      filter: isCompleted ? "grayscale(100%)" : "none",
                      opacity: isCompleted ? 0.6 : 1,
                    }}
                    onClick={() => toggleChampion(champ)}
                  >
                    <div className="relative overflow-hidden rounded-lg border-2 border-[#2a2a3a] group-hover:border-orange-400 transition-colors duration-200">
                      <img 
                        src={champ.image} 
                        alt={champ.name} 
                        className="w-full aspect-square object-cover" 
                      />
                      {isCompleted && (
                        <div className="absolute inset-0 bg-gradient-to-t from-orange-500/80 to-transparent flex items-end justify-center pb-2">
                          <div className="bg-orange-400 text-white text-xs font-bold px-2 py-1 rounded">
                            ✓
                          </div>
                        </div>
                      )}
                      {!isCompleted && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                          <div className="bg-orange-400 text-white text-xs font-bold px-2 py-1 rounded">
                            Mark
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs mt-2 text-white font-medium group-hover:text-orange-400 transition-colors duration-200">
                      {champ.name}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
  );
}

export default ChampionTracker;