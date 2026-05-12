import React from "react";

const ProfileStats = React.memo(({ stats = {}, filteredStats = null, selectedChampion = null, champByKey = null }) => {
  console.log("rerendering")
  const currentStats = filteredStats || stats;
  const isFiltered = filteredStats !== null;
  
  return (
    <div className="w-1/4 border border-accent p-4 mr-4 bg-secondary rounded-lg self-start">
      <h2>Stats</h2>
      {isFiltered && (
        <div className="mb-3 p-2 bg-blue-600/20 border border-blue-500/30 rounded text-sm">
          <p className="text-blue-300 font-medium">
            {selectedChampion && champByKey ? champByKey[selectedChampion]?.name : "Champion"} Filtered
          </p>
        </div>
      )}
      <p>Win Rate: {(currentStats.winrate*100).toFixed(2)}%</p>
      <p>Games Played: {currentStats.games_played}</p>
    </div>
  );
});

export default ProfileStats;