import { getWinrate } from "../utils/gameUtils";

export default function ChampionSelect({ 
  inChampSelect, 
  initialSelection, 
  picks, 
  bench, 
  options, 
  completedChamps, 
  winrates, 
  champByKey 
}) {
  // Debug: Log the props to see what data we're getting
  console.log('ChampionSelect props:', {
    inChampSelect,
    picks: picks?.length,
    bench: bench?.length,
    options: options?.length,
    winrates: winrates?.length,
    champByKey: Object.keys(champByKey || {}).length
  });
  const getChampWinrate = (champId) => {
    if (!winrates || !Array.isArray(winrates)) {
      console.warn('winrates is not available:', winrates);
      return 0;
    }
    const champ = winrates.find(c => {return c.champ_id === Number(champId)});
    return champ ? champ.winrate : 0;
  }

  if (!inChampSelect) {
    return (
      <div className="flex flex-col p-4 md:p-6 text-[#f0f0f0] bg-gradient-to-br from-[#0f0f23] to-[#1a1a2e] min-h-full overflow-hidden">
        <div className="flex justify-center mb-6">
          <div className="bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-xl px-6 py-3 backdrop-blur-sm">
            <p className="text-center text-red-400 font-bold text-lg">
                No live game found
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex ml-16 flex-col p-4 md:p-6 text-[#f0f0f0] min-h-full overflow-hidden">
      
      {/* Bench */}
      {inChampSelect && (
        <div className="mb-8">
          <div className="text-center mb-4">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center justify-center gap-2">
              <span className="text-2xl"></span> Champion Bench
            </h3>
            <div className="h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent max-w-md mx-auto"></div>
          </div>
          <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 justify-center px-4">
            {Array.from({ length: 10 }).map((_, index) => {
              const champ = bench[index];
              const isEmpty = !champ;

              const completed = champ
                ? completedChamps[champ.id] === true
                : false;

              const winrate = champ
                ? getChampWinrate(champ.key) || 0
                : 0;

              return (
                <div
                  key={index}
                  className={`group relative w-[90px] md:w-[100px] h-[110px] md:h-[120px] rounded-xl overflow-hidden flex-shrink-0 flex flex-col items-center bg-gradient-to-br from-[#2a2a3a]/80 to-[#333344]/80 backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl border-2 ${
                    completed 
                      ? "border-emerald-500 ring-2 ring-emerald-500/20" 
                      : "border-[#4a4a5a] hover:border-purple-500/50"
                  }`}
                >
                  <div className="relative w-full h-[85px] md:h-[95px]">
                    <img
                      src={
                        champ
                          ? champ.image
                          : "./ChampionSquare.webp"
                      }
                      alt={champ ? champ.name : "Empty"}
                      className={`w-full h-full object-cover transition-all duration-300 ${
                        isEmpty ? "opacity-30" : "group-hover:scale-110"
                      }`}
                    />
                    {completed && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#1a1a2e] shadow-lg"></div>
                    )}
                    {champ && !isEmpty && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    )}
                  </div>

                  <div className="flex-1 flex items-center justify-center w-full bg-gradient-to-b from-transparent to-[#1a1a2e]/50">
                    <span className={`text-xs md:text-sm font-bold ${
                      winrate >= 0.55 ? 'text-emerald-400' :
                      winrate >= 0.5 ? 'text-yellow-400' :
                      'text-gray-400'
                    }`}>
                      {champ ? `${(winrate * 100).toFixed(1)}%` : "--"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MAIN AREA */}
      <div className="flex flex-col lg:flex-row flex-1 gap-6 lg:gap-10 w-[90%] lg:w-[90%] mx-auto">
        
        {/* LEFT: Picks */}
        <div className="flex flex-col h-[60vh] w-full lg:w-[300px] gap-3 order-1 lg:order-1">
          <div className="text-center">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center justify-center gap-2">
              <span className="text-2xl"></span> Team Picks
            </h3>
            <div className="h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent max-w-xs mx-auto"></div>
          </div>
          {picks.map((p) => {
            const champ = p.champ || {
              id: -1,
              name: "Unknown",
              image: "./ChampionSquare.webp",
            };

            const completed = completedChamps[champ.id] === true;
            const winrate = getChampWinrate(champ.key);

            return (
              <div
                key={p.Summoner}
                className="group relative flex items-center gap-4 bg-gradient-to-r from-[#2a2a3a]/80 to-[#333344]/80 backdrop-blur-md px-6 py-4 rounded-xl w-full shadow-lg border border-[#4a4a5a]/30 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:border-blue-500/50"
                style={{ minHeight: 'calc(12vh - 2px)' }}
              >
                {/* LEFT: image + winrate */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="relative">
                    <img
                      src={champ.image}
                      alt={champ.name}
                      className={`w-20 h-20 object-cover rounded-xl border-2 transition-all duration-300 group-hover:scale-110 ${
                        completed 
                          ? "border-emerald-500 ring-2 ring-emerald-500/20" 
                          : "border-[#4a4a5a] group-hover:border-blue-500/50"
                      }`}
                    />
                    {completed && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#1a1a2e] shadow-lg"></div>
                    )}
                  </div>

                  <div className={`mt-2 px-2 py-1 rounded-full text-xs font-bold ${
                    winrate >= 0.55 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    winrate >= 0.5 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                    'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                  }`}>
                    {winrate !== undefined
                      ? `${(winrate * 100).toFixed(1)}%`
                      : "—"}
                  </div>
                </div>

                {/* RIGHT: summoner */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <span className="truncate text-base lg:text-lg font-semibold text-white group-hover:text-blue-400 transition-colors duration-300">
                    {p.Summoner}
                  </span>
                  <span className="text-sm text-gray-400 truncate">
                    {champ.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* MIDDLE: Options */}
        {initialSelection && (
          <div className="flex flex-1 justify-center items-center order-2 lg:order-2">
            <div className="bg-gradient-to-br from-[#2a2a3a]/50 to-[#333344]/50 backdrop-blur-md rounded-2xl p-6 lg:p-8 shadow-2xl border border-[#4a4a5a]/30">
              <div className={`grid gap-4 lg:gap-6 ${
                options.length === 1 ? 'grid-cols-1' :
                options.length === 2 ? 'grid-cols-2' :
                'grid-cols-2 lg:grid-cols-3'
              }`}>
                {options.map((c) => {
                  const champ = champByKey[c];
                  const winrate = getChampWinrate(champ.key) || 0;
                  const completed = completedChamps[champ.id] === true;

                  return (
                    <div
                      key={champ.id}
                      className={`group relative rounded-xl overflow-hidden flex flex-col items-center bg-gradient-to-br from-[#1a1a2e]/80 to-[#2a2a3a]/80 backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl border-2 ${
                        completed 
                          ? "border-emerald-500 ring-2 ring-emerald-500/20" 
                          : "border-[#4a4a5a] hover:border-purple-500/50"
                      }`}
                    >
                      <div className="relative overflow-hidden">
                        <img
                          src={`https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${champ.id}_0.jpg`}
                          alt={champ.name}
                          className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110"
                        />
                        {completed && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full border-2 border-[#1a1a2e] shadow-lg"></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110"></div>
                        <div className="absolute bottom-0 left-0 right-0 p-2 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110">
                          <p className="text-xs font-bold text-center truncate">{champ.name}</p>
                        </div>
                      </div>

                      <div className="w-full p-3 bg-gradient-to-b from-transparent to-[#1a1a2e]/50">
                        <div className={`px-3 py-1 rounded-full text-xs font-bold text-center ${
                          winrate >= 0.55 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          winrate >= 0.5 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                          'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                        }`}>
                          {(winrate * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
