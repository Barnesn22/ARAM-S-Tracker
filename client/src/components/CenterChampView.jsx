import { useState, useEffect } from "react";
import apiClient from "../api/client";

function CenterChampView({ champ, winrate, itemMap, augmentMap }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [itemWR, setItemWR] = useState([]);
    const [augmentsByRarity, setAugmentsByRarity] = useState([]);
    const [loading, setLoading] = useState(true);
    const rarityOrder = ["kSilver", "kGold", "kPrismatic"];
    const topItems = [...itemWR]
      .filter(item => item.games_played && item.games_played > 25)
      .sort((a, b) => b.winrate - a.winrate)
      .slice(0, 10);
    
    console.log("itemWR:", itemWR)
    console.log("topItems:", topItems)

    useEffect(() => {
        const fetchChampionData = async () => {
            console.log("Fetching champion data for:", champ);
            if (!champ?.key) return;
            
            try {
                setLoading(true);
                
                // Fetch item stats, augment stats, and metadata in parallel
                const [itemStats, augmentStats] = await Promise.all([
                    apiClient.getChampionItemStats(champ.key),
                    apiClient.getChampionAugmentStats(champ.key)
                ]);

                console.log("Raw itemStats:", itemStats)
                console.log("itemMap:", itemMap)

                const enrichedItems = itemStats.map(i => ({
                  ...i,
                  meta: itemMap && itemMap[i.key] || itemMap[i.item_id]
                }));

                const enrichedAugments = augmentStats.map(a => ({
                  ...a,
                  meta: augmentMap && augmentMap[a.key] || augmentMap[a.augment_id]
                }));
                
                // Group augments by rarity
                const augmentsByRarity = enrichedAugments.reduce((acc, augment) => {
                  const rarity = augment.rarity;
                  if (!acc[rarity]) {
                    acc[rarity] = [];
                  }
                  acc[rarity].push(augment);
                  return acc;
                }, {});
                
                console.log("Processed items:", enrichedItems)
                console.log("Processed augments:", enrichedAugments)
                console.log("Augments grouped by rarity:", augmentsByRarity)

                setItemWR(enrichedItems);
                setAugmentsByRarity(augmentsByRarity);

            } catch (error) {
                console.error('Error fetching champion data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchChampionData();
    }, [champ?.id]);

    const isAugmentMatch = (aug) => {
      if (!searchTerm.trim()) return false;
      const name = aug.meta?.nameTRA?.toLowerCase() || "";
      return name.includes(searchTerm.toLowerCase());
    };

    if (loading) {
        return (
            <div className="flex flex-col w-full h-full bg-gradient-to-b from-transparent to-[#1a1a2e]/30 rounded-2xl p-6 items-center justify-center">
                <div className="text-white text-lg">Loading champion data...</div>
            </div>
        );
    }

    return (
      <div className="flex flex-col w-full h-full bg-gradient-to-b from-transparent to-[#1a1a2e]/30 rounded-2xl p-6">

        {/* ================= TOP HALF ================= */}
        <div className="flex flex-1 items-center justify-center gap-6 lg:gap-12 flex-col lg:flex-row">

          {/* LEFT SIDE — CHAMP */}
          <div className="flex flex-col items-center bg-gradient-to-br from-[#2a2a3a]/50 to-[#333344]/50 backdrop-blur-md rounded-2xl p-4 lg:p-8 shadow-2xl border border-[#4a4a5a]/30 w-full lg:w-auto">
            <div className="relative">
              <img
                src={champ.image}
                alt={champ.name}
                className="w-24 h-24 lg:w-32 lg:h-32 rounded-xl mb-4 border-4 border-[#4a4a5a] shadow-xl"
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-emerald-500/20 to-transparent pointer-events-none"></div>
            </div>

            <h1 className="text-2xl lg:text-4xl font-bold text-white mb-2 text-center">{champ.name}</h1>

            <div className="flex items-center gap-2">
              <div className={`px-3 py-1 lg:px-4 lg:py-2 rounded-full font-bold text-xs lg:text-sm ${
                winrate >= 0.55 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                winrate >= 0.5 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {(winrate * 100).toFixed(2)}% Winrate
              </div>
            </div>
          </div>

          {/* RIGHT SIDE — ITEMS */}
          <div className="flex flex-col items-center bg-gradient-to-br from-[#2a2a3a]/50 to-[#333344]/50 backdrop-blur-md rounded-2xl p-4 lg:p-8 shadow-2xl border border-[#4a4a5a]/30 w-full lg:w-auto">
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-4 lg:mb-6 flex items-center gap-2">
              <span className="text-xl lg:text-2xl"></span> Top Items
            </h2>

            <div className="grid grid-cols-5 lg:gap-4 gap-2">
              {topItems.map((item, index) => (
                console.log(item),
                <div key={item.item_id} className="flex flex-col items-center group">
                  <div className="relative">
                    <img
                      src={item.meta.image}
                      className="w-10 h-10 lg:w-14 lg:h-14 rounded-lg border-2 border-[#4a4a5a] shadow-md transition-all duration-300 group-hover:scale-110 group-hover:border-yellow-500/50 group-hover:shadow-lg"
                    />
                  </div>
                  <p className={`text-xs lg:text-sm mt-1 lg:mt-2 font-semibold ${
                    item.winrate >= 0.6 ? 'text-emerald-400' :
                    item.winrate >= 0.55 ? 'text-yellow-400' :
                    'text-gray-400'
                  }`}>
                    {(item.winrate * 100).toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ================= BOTTOM HALF ================= */}
        <div className="flex flex-col flex-1 mb-8 mt-4 pt-6 bg-gradient-to-br from-[#2a2a3a]/30 to-[#333344]/30 backdrop-blur-sm rounded-2xl p-6 border border-[#4a4a5a]/20">
          {/* Search Bar */}
          <div className="flex justify-center mb-6">
            <div className="relative w-80">
              <input
                type="text"
                placeholder="Search augments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-[#2a2a3a]/80 text-white rounded-xl border border-[#4a4a5a] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 placeholder-gray-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white text-lg leading-none transition-colors duration-200"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 flex-1">
          {rarityOrder.map((rarity) => {
            const list = Array.isArray(augmentsByRarity?.[rarity])
              ? augmentsByRarity[rarity]
              : [];

            const rarityColors = {
              'kSilver': 'from-gray-500 to-gray-600',
              'kGold': 'from-yellow-500 to-amber-600', 
              'kPrismatic': 'from-purple-500 to-pink-600'
            };

            return (
              <div key={rarity} className="flex flex-col items-center">
                <h3 className={`text-base md:text-lg font-bold mb-3 md:mb-4 bg-gradient-to-r ${rarityColors[rarity]} bg-clip-text text-transparent`}>
                  {rarity.replace("k", "").toUpperCase()}
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3 max-h-64 md:max-h-96 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-[#4a4a5a] scrollbar-track-transparent w-full">
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
                            src={aug.meta.img}
                            className={`w-10 h-10 md:w-14 md:h-14 cursor-pointer rounded-lg border-2 border-[#4a4a5a] shadow-md transition-all duration-300 hover:scale-110 hover:shadow-lg ${
                              isAugmentMatch(aug) 
                                ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#1e1e2f] scale-110 border-blue-500' 
                                : ''
                            }`}
                          />

                          {/* Tooltip */}
                          <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-[#2a2a3a] to-[#333344] text-white text-xs md:text-sm p-2 md:p-3 rounded-xl shadow-2xl w-48 md:w-56 z-50 pointer-events-none border border-[#4a4a5a]/50">
                            <div className="font-bold text-white mb-1 md:mb-2 text-xs md:text-sm">{aug.meta?.nameTRA}</div>
                            <div className="flex justify-between text-xs">
                              <span className="text-blue-400">Pick: {(aug.playrate * 100).toFixed(2)}%</span>
                              <span className={`font-bold ${
                                aug.winrate >= 0.55 ? 'text-emerald-400' :
                                aug.winrate >= 0.5 ? 'text-yellow-400' :
                                'text-red-400'
                              }`}>Win: {(aug.winrate * 100).toFixed(2)}%</span>
                            </div>
                          </div>
                        </div>

                        <p className={`text-xs mt-1 md:mt-2 font-bold ${
                          aug.winrate >= 0.55 ? 'text-emerald-400' :
                          aug.winrate >= 0.5 ? 'text-yellow-400' :
                          'text-gray-400'
                        }`}>
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