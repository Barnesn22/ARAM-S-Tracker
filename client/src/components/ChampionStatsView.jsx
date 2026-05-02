import { useState } from "react";

function convertToCDragon(path) {
  return "https://raw.communitydragon.org/latest/game/" +
    path.replace("/lol-game-data/assets/", "").replace("small", "large").toLowerCase();
}

export default function ChampionStatsView({ champ, itemWR, augmentsByRarity, winrate, additionalStats }) {
  const [activeTab, setActiveTab] = useState("items");
  const rarityOrder = ["kSilver", "kGold", "kPrismatic"];
  const topItems = [...itemWR]
    .sort((a, b) => b.winrate - a.winrate)
    .slice(0, 10);

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
            <div className="w-full max-w-5xl">
              <div className="bg-[#1a1a2e] rounded-xl p-6 shadow-2xl border border-[#2a2a3a]">
                <h3 className="text-xl font-bold text-white mb-6 text-center">Top Items by Winrate</h3>
                <div className="grid grid-cols-5 gap-4">
                  {topItems.map((item, index) => (
                    <div 
                      key={item.item_id} 
                      className="flex flex-col items-center bg-[#2a2a3a] rounded-lg p-3 hover:bg-[#3a3a4a] transition-all duration-200 hover:scale-105 hover:shadow-lg group relative"
                    >
                      <div className="relative">
                        <img
                          src={`https://ddragon.leagueoflegends.com/cdn/14.10.1/img/item/${item.item_id}.png`}
                          className="w-16 h-16 rounded-lg"
                        />
                        <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                          {index + 1}
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-white mt-2">
                        {(item.winrate * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-400">
                        {item.games} games
                      </p>
                      <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black text-white text-xs p-2 rounded shadow-lg w-48 z-50 pointer-events-none">
                        <div className="font-bold">{item.meta?.name || 'Unknown Item'}</div>
                        <div>Win Rate: {(item.winrate * 100).toFixed(2)}%</div>
                        <div>Games: {item.games}</div>
                      </div>
                    </div>
                  ))}
                </div>
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
                                    src={convertToCDragon(aug.meta.augmentSmallIconPath)}
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
            <div className="w-full max-w-4xl">
              <div className="bg-[#1a1a2e] rounded-xl p-8 shadow-2xl border border-[#2a2a3a] text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-[#2a2a3a] rounded-full flex items-center justify-center">
                    <span className="text-2xl">⚔️</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Champion Counters</h3>
                <p className="text-gray-400 mb-6">Counter statistics coming soon...</p>
                <div className="bg-[#2a2a3a] rounded-lg p-4">
                  <p className="text-sm text-gray-500">This section will show champions that perform well against {champ.name}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "synergies" && (
          <div className="flex justify-center">
            <div className="w-full max-w-4xl">
              <div className="bg-[#1a1a2e] rounded-xl p-8 shadow-2xl border border-[#2a2a3a] text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-[#2a2a3a] rounded-full flex items-center justify-center">
                    <span className="text-2xl">🤝</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Champion Synergies</h3>
                <p className="text-gray-400 mb-6">Synergy data coming soon...</p>
                <div className="bg-[#2a2a3a] rounded-lg p-4">
                  <p className="text-sm text-gray-500">This section will show champions that work well with {champ.name}</p>
                </div>
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
