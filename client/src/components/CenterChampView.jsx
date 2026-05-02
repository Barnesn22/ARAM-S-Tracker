import { useState, version, useEffect } from "react";

function convertToCDragon(path) {
  return "https://raw.communitydragon.org/latest/game/" +
    path.replace("/lol-game-data/assets/", "").replace("small", "large").toLowerCase();
}


function CenterChampView({ champ, itemWR, augmentsByRarity, winrate }) {
    const [searchTerm, setSearchTerm] = useState("");
    const rarityOrder = ["kSilver", "kGold", "kPrismatic"];
    const topItems = [...itemWR]
      .sort((a, b) => b.winrate - a.winrate)
      .slice(0, 10);

    const isAugmentMatch = (aug) => {
      if (!searchTerm.trim()) return false;
      const name = aug.meta?.nameTRA?.toLowerCase() || "";
      return name.includes(searchTerm.toLowerCase());
    };

    return (
      <div className="flex flex-col w-[60%] h-full">

        {/* ================= TOP HALF ================= */}
        <div className="flex flex-1 items-center justify-center gap-10">

          {/* LEFT SIDE — CHAMP */}
          <div className="flex flex-col items-center">
            <img
              src={champ.image}
              alt={champ.name}
              className="rounded-lg mb-4"
            />

            <h1 className="text-3xl font-bold">{champ.name}</h1>

            <p className="text-lg text-gray-300">
              {(winrate * 100).toFixed(2)}% Winrate
            </p>
          </div>

          {/* RIGHT SIDE — ITEMS */}
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-semibold mb-3">Top Items</h2>

            <div className="grid grid-cols-5 gap-4">
              {topItems.map((item) => (
                <div key={item.item_id} className="flex flex-col items-center">
                  <img
                    src={`https://ddragon.leagueoflegends.com/cdn/14.10.1/img/item/${item.item_id}.png`}
                    className="w-12 h-12"
                  />
                  <p className="text-sm mt-1">
                    {(item.winrate * 100).toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ================= BOTTOM HALF ================= */}
        <div className="flex flex-col flex-1 mb-16 pt-4">
          {/* Search Bar */}
          <div className="flex justify-center mb-4">
            <div className="relative w-64">
              <input
                type="text"
                placeholder="Search augments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-[#2a2a3a] text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
              {searchTerm && (
                <div
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white text-lg leading-none cursor-pointer"
                >
                  ✕
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 flex-1">
          {rarityOrder.map((rarity) => {
            const list = Array.isArray(augmentsByRarity?.[rarity])
              ? augmentsByRarity[rarity]
              : [];

            return (
              <div key={rarity} className="flex flex-col items-center">
                <h3 className="text-md font-bold mb-2">
                  {rarity.replace("k", "").toUpperCase()}
                </h3>

                <div className="grid grid-cols-4 gap-3">
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
                            className={`w-12 h-12 cursor-pointer transition-all duration-200 ${
                              isAugmentMatch(aug) 
                                ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#1e1e2f] scale-110' 
                                : ''
                            }`}
                          />

                          {/* Tooltip */}
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

      </div>
    );
  }

export default CenterChampView