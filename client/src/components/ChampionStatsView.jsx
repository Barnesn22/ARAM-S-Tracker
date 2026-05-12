import { useState } from "react";

function convertToCDragon(path) {
  return "https://raw.communitydragon.org/latest/game/" +
    path.replace("/lol-game-data/assets/", "").replace("small", "large").toLowerCase();
}

export default function ChampionStatsView({ champ, itemWR, bootsWR, augmentsByRarity, champByKey, winrate, additionalStats, games, counters, synergies }) {
  const [activeTab, setActiveTab] = useState("items");
  const [itemSortBy, setItemSortBy] = useState("playrate");
  const rarityOrder = ["kSilver", "kGold", "kPrismatic"];

  return (
    <div className="flex flex-col w-full h-full">
      
      {/* Fixed Header Section */}
      <div className="flex-shrink-0">
        {/* Champion Header */}
        <div className="flex items-center justify-center gap-10 mb-8">
          <div className="flex flex-col items-center">
            <img
              src={champ.image}
              alt={champ.name}
              className="w-32 h-32 rounded-lg mb-4"
            />
            <h1 className="text-4xl font-bold">{champ.name}</h1>
            <p className="text-xl text-gray-300">
              {(winrate * 100).toFixed(2)}% Winrate
            </p>
            <p className="text-xl text-gray-300">
              {games} Games
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-6">
          <div className="flex gap-2 bg-[#2a2a3a] rounded-lg p-1">
            {['items', 'augments', 'counters', 'synergies', 'history'].map((tab) => (
              <div
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded capitalize transition-colors cursor-pointer ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable Tab Content */}
      <div className="flex-1 overflow-y-auto min-h-0 hidden-scrollbar">
        {activeTab === "items" && (
          <div className="flex justify-center">
            <div className="w-full max-w-6xl space-y-6">
              {/* Sort Controls */}
              <div className="flex justify-center">
                <div className="flex gap-2 bg-[#2a2a3a] rounded-lg p-1">
                  <div
                    onClick={() => setItemSortBy("winrate")}
                    className={`px-4 py-2 rounded capitalize transition-colors cursor-pointer ${
                      itemSortBy === "winrate"
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Sort by Winrate
                  </div>
                  <div
                    onClick={() => setItemSortBy("playrate")}
                    className={`px-4 py-2 rounded capitalize transition-colors cursor-pointer ${
                      itemSortBy === "playrate"
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Sort by Playrate
                  </div>
                </div>
              </div>

              {/* Main Content Layout */}
              <div className="flex gap-6">
                {/* All Items Section - Main Grid */}
                <div className="flex-1 bg-[#1a1a2e] rounded-xl p-6 shadow-2xl border border-[#2a2a3a]">
                  <h3 className="text-xl font-bold text-white mb-6 text-center">
                    All Items (by {itemSortBy === "winrate" ? "Winrate" : "Playrate"})
                  </h3>
                  <div className="grid grid-cols-6 gap-3">
                    {[...itemWR]
                      .sort((a, b) => itemSortBy === "winrate" ? b.winrate - a.winrate : b.games_played - a.games_played)
                      .map((item, index) => (
                      <div 
                        key={item.item_id} 
                        className="flex flex-col items-center bg-[#2a2a3a] rounded p-2 hover:bg-[#3a3a4a] transition-all duration-200 hover:scale-105 hover:shadow-lg group relative"
                      >
                        <div className="relative">
                          <img
                            src={item.meta.image}
                            className="w-12 h-12 rounded"
                          />
                          <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {index + 1}
                          </div>
                        </div>
                        <p className="text-xs font-semibold text-white mt-1">
                          {(item.winrate * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-400">
                          {item.games_played} games
                        </p>
                        <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black text-white text-xs p-2 rounded shadow-lg w-48 z-50 pointer-events-none">
                          <div className="font-bold">{item.meta?.name || 'Unknown Item'}</div>
                          <div>Win Rate: {(item.winrate * 100).toFixed(2)}%</div>
                          <div>Play Rate: {(item.games_played * 100 / games).toFixed(2)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Boots Section - Right Column */}
                {bootsWR && bootsWR.length > 0 && (
                  <div className="w-48 bg-[#1a1a2e] rounded-xl p-4 shadow-2xl border border-[#2a2a3a]">
                    <h3 className="text-lg font-bold text-white mb-4 text-center">
                      Boots (by {itemSortBy === "winrate" ? "Winrate" : "Playrate"})
                    </h3>
                    <div className="flex flex-col gap-3">
                      {[...bootsWR]
                        .sort((a, b) => itemSortBy === "winrate" ? b.winrate - a.winrate : b.games_played - a.games_played)
                        .map((item, index) => (
                        <div 
                          key={item.item_id} 
                          className="flex flex-col items-center bg-[#2a2a3a] rounded p-3 hover:bg-[#3a3a4a] transition-all duration-200 hover:scale-105 hover:shadow-lg group relative"
                        >
                          <div className="relative">
                            <img
                              src={item.meta.image}
                              className="w-12 h-12 rounded"
                            />
                          </div>
                          <p className="text-xs font-semibold text-white mt-2">
                            {(item.winrate * 100).toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-400">
                            {item.games_played} games
                          </p>
                          <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black text-white text-xs p-2 rounded shadow-lg w-48 z-50 pointer-events-none">
                            <div className="font-bold">{item.meta?.name || 'Unknown Item'}</div>
                            <div>Win Rate: {(item.winrate * 100).toFixed(2)}%</div>
                            <div>Play Rate: {(item.games_played * 100 / games).toFixed(2)}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "augments" && (
          <div className="flex justify-center">
            <div className="w-full max-w-6xl">
              <div className="bg-[#1a1a2e] rounded-xl p-6 shadow-2xl border border-[#2a2a3a]">
                <h3 className="text-xl font-bold text-white mb-6 text-center">Augments by Rarity</h3>
                <div className="grid grid-cols-3 gap-8">
                  {rarityOrder.map((rarity) => {
                    const list = Array.isArray(augmentsByRarity?.[rarity])
                      ? augmentsByRarity[rarity]
                      : [];

                    const rarityColors = {
                      "kSilver": "bg-gray-500",
                      "kGold": "bg-yellow-500", 
                      "kPrismatic": "bg-purple-500"
                    };

                    return (
                      <div key={rarity} className="flex flex-col">
                        <div className="flex items-center justify-center mb-4">
                          <div className={`w-3 h-3 rounded-full ${rarityColors[rarity] || "bg-gray-500"} mr-2`}></div>
                          <h3 className="text-lg font-bold text-white">
                            {rarity.replace("k", "").toUpperCase()}
                          </h3>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {list
                            .slice()
                            .sort((a, b) => b.winrate - a.winrate)
                            .map((aug, index) => (
                              <div
                                key={aug.augment_id}
                                className="flex flex-col items-center bg-[#2a2a3a] rounded-lg p-3 hover:bg-[#3a3a4a] transition-all duration-200 hover:scale-105 hover:shadow-lg group relative"
                              >
                                <div className="relative">
                                  <img
                                    src={aug.meta.image}
                                    className="w-12 h-12 rounded-lg cursor-pointer"
                                  />
                                  {index < 3 && (
                                    <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                      {index + 1}
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs font-semibold text-white mt-2">
                                  {(aug.winrate * 100).toFixed(1)}%
                                </p>
                                <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black text-white text-xs p-2 rounded shadow-lg w-56 z-50 pointer-events-none">
                                  <div className="font-bold">{aug.meta?.nameTRA || 'Unknown Augment'}</div>
                                  <div>Pick Rate: {(aug.playrate * 100).toFixed(2)}%</div>
                                  <div>Win Rate: {(aug.winrate * 100).toFixed(2)}%</div>
                                  <div>Games: {aug.games}</div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "counters" && (
          <div className="flex justify-center">
            <div className="w-full max-w-6xl">
              <div className="bg-[#1a1a2e] rounded-xl p-6 shadow-2xl border border-[#2a2a3a]">
                <div className="flex items-center justify-center mb-6">
                  <h3 className="text-2xl font-bold text-white">Champion Counters</h3>
                </div>
                {counters && counters.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-white">
                      <thead>
                        <tr className="border-b border-[#2a2a3a]">
                          <th className="text-left py-3 px-4 font-semibold">Rank</th>
                          <th className="text-left py-3 px-4 font-semibold">Champion</th>
                          <th className="text-center py-3 px-4 font-semibold">Games Together</th>
                          <th className="text-center py-3 px-4 font-semibold">{champ.name} Winrate</th>
                          <th className="text-center py-3 px-4 font-semibold">Encounter Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {counters.map((counter, index) => (
                          <tr key={counter.opponent_champ_id} className="border-b border-[#2a2a3a] hover:bg-[#2a2a3a] transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center">
                                <span className="font-bold text-lg text-blue-400">#{index + 1}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center">
                                {counter.meta && (
                                  <>
                                    <img
                                      src={counter.meta.image}
                                      alt={counter.meta.name}
                                      className="w-8 h-8 rounded mr-3"
                                    />
                                    <span className="font-medium">{counter.meta.name}</span>
                                  </>
                                )}
                                {!counter.meta && (
                                  <span className="text-gray-400">Champion {counter.opponent_champ_id}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="text-gray-300">{counter.games_together}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`font-semibold ${
                                counter.target_champ_winrate < 0.45 ? 'text-red-400' : 
                                counter.target_champ_winrate < 0.5 ? 'text-orange-400' : 
                                'text-yellow-400'
                              }`}>
                                {(counter.target_champ_winrate * 100).toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="text-gray-300">{(counter.playrate * 100).toFixed(1)}%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No counter data available</p>
                    <p className="text-gray-500 text-sm mt-2">This may require more games to be played</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "synergies" && (
          <div className="flex justify-center">
            <div className="w-full max-w-6xl">
              <div className="bg-[#1a1a2e] rounded-xl p-6 shadow-2xl border border-[#2a2a3a]">
                <div className="flex items-center justify-center mb-6">
                  <h3 className="text-2xl font-bold text-white">Champion Synergies</h3>
                </div>
                {synergies && synergies.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-white">
                      <thead>
                        <tr className="border-b border-[#2a2a3a]">
                          <th className="text-left py-3 px-4 font-semibold">Rank</th>
                          <th className="text-left py-3 px-4 font-semibold">Champion</th>
                          <th className="text-center py-3 px-4 font-semibold">Games Together</th>
                          <th className="text-center py-3 px-4 font-semibold">{champ.name} Winrate</th>
                          <th className="text-center py-3 px-4 font-semibold">Team Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {synergies.map((synergy, index) => (
                          <tr key={synergy.ally_champ_id} className="border-b border-[#2a2a3a] hover:bg-[#2a2a3a] transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center">
                                <span className="font-bold text-lg text-green-400">#{index + 1}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center">
                                {synergy.meta && (
                                  <>
                                    <img
                                      src={synergy.meta.image}
                                      alt={synergy.meta.name}
                                      className="w-8 h-8 rounded mr-3"
                                    />
                                    <span className="font-medium">{synergy.meta.name}</span>
                                  </>
                                )}
                                {!synergy.meta && (
                                  <span className="text-gray-400">Champion {synergy.ally_champ_id}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="text-gray-300">{synergy.games_together}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`font-semibold ${
                                synergy.target_champ_winrate > 0.55 ? 'text-green-400' : 
                                synergy.target_champ_winrate > 0.5 ? 'text-blue-400' : 
                                'text-gray-400'
                              }`}>
                                {(synergy.target_champ_winrate * 100).toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="text-gray-300">{(synergy.playrate * 100).toFixed(1)}%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No synergy data available</p>
                    <p className="text-gray-500 text-sm mt-2">This may require more games to be played</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="flex justify-center">
            <div className="w-full max-w-4xl">
              <div className="bg-[#1a1a2e] rounded-xl p-8 shadow-2xl border border-[#2a2a3a] text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-[#2a2a3a] rounded-full flex items-center justify-center">
                    <span className="text-2xl">📈</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Performance History</h3>
                <p className="text-gray-400 mb-6">Historical data coming soon...</p>
                <div className="bg-[#2a2a3a] rounded-lg p-4">
                  <p className="text-sm text-gray-500">This section will show {champ.name}'s performance over time</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
