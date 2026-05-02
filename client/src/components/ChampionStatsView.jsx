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
            <div className="grid grid-cols-5 gap-4">
              {topItems.map((item) => (
                <div key={item.item_id} className="flex flex-col items-center">
                  <img
                    src={`https://ddragon.leagueoflegends.com/cdn/14.10.1/img/item/${item.item_id}.png`}
                    className="w-16 h-16"
                  />
                  <p className="text-sm mt-1">
                    {(item.winrate * 100).toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "augments" && (
          <div className="flex justify-center">
            <div className="grid grid-cols-3 gap-8 max-w-4xl">
              {rarityOrder.map((rarity) => {
                const list = Array.isArray(augmentsByRarity?.[rarity])
                  ? augmentsByRarity[rarity]
                  : [];

                return (
                  <div key={rarity} className="flex flex-col items-center">
                    <h3 className="text-lg font-bold mb-4">
                      {rarity.replace("k", "").toUpperCase()}
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      {list
                        .slice()
                        .sort((a, b) => b.winrate - a.winrate)
                        .map((aug) => (
                          <div
                            key={aug.augment_id}
                            className="flex flex-col items-center group relative"
                          >
                            <div className="relative">
                              <img
                                src={convertToCDragon(aug.meta.augmentSmallIconPath)}
                                className="w-12 h-12 cursor-pointer"
                              />
                              <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black text-white text-xs p-2 rounded shadow-lg w-48 z-50 pointer-events-none">
                                <div className="font-bold">{aug.meta?.nameTRA}</div>
                                <div>Pick: {(aug.playrate * 100).toFixed(2)}%</div>
                                <div>Win: {(aug.winrate * 100).toFixed(2)}%</div>
                              </div>
                            </div>
                            <p className="text-xs mt-1">
                              {(aug.winrate * 100).toFixed(0)}%
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "counters" && (
          <div className="flex justify-center items-center">
            <div className="text-center text-gray-400">
              <h3 className="text-2xl mb-4">Champion Counters</h3>
              <p>Counter statistics coming soon...</p>
              {/* Add counter data here */}
            </div>
          </div>
        )}

        {activeTab === "synergies" && (
          <div className="flex justify-center items-center">
            <div className="text-center text-gray-400">
              <h3 className="text-2xl mb-4">Champion Synergies</h3>
              <p>Synergy data coming soon...</p>
              {/* Add synergy data here */}
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="flex justify-center items-center">
            <div className="text-center text-gray-400">
              <h3 className="text-2xl mb-4">Performance History</h3>
              <p>Historical data coming soon...</p>
              {/* Add performance history here */}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
