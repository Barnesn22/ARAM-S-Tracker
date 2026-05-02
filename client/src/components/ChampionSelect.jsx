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
  const getChampWinrate = (champId) => {
    const champ = winrates.find(c => {return c.champ_id === Number(champId)});
    return champ ? champ.winrate : 0;
  }

  if (!inChampSelect) {
    return (
      <div className="flex flex-col p-5 text-[#f0f0f0] bg-[#1e1e2f]">
        <div className="flex justify-center mb-5">
          <p className="text-center text-red-500 font-bold my-5">
            Not in Champ Select
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-5 text-[#f0f0f0] bg-[#1e1e2f]">
      
      {/* Bench */}
      <div className="flex gap-2.5 overflow-x-auto pb-5 justify-center">
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
              className={`w-[100px] h-[120px] rounded-lg overflow-hidden flex-shrink-0 flex flex-col items-center bg-[#2a2a3a]
                ${completed ? "border-4 border-green-500" : "border-4 border-gray-600"}`}
            >
              <img
                src={
                  champ
                    ? champ.image
                    : "./ChampionSquare.webp"
                }
                alt={champ ? champ.name : "Empty"}
                className={`w-full h-[100px] object-cover ${
                  isEmpty ? "opacity-40" : ""
                }`}
              />

              <span className="mt-1 text-sm font-bold">
                {champ ? `${(winrate * 100).toFixed(2)}%` : "--"}
              </span>
            </div>
          );
        })}
      </div>

      {/* MAIN AREA */}
      <div className="flex flex-1 gap-10 w-[90%] pt-5">
        
        {/* LEFT: Picks */}
        <div className="flex flex-col py-2 w-[300px] gap-2">
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
                className="flex items-center py-2 gap-3 bg-[#333] px-3 rounded-lg w-full"
                style={{ height: 'calc(15vh - 8px)' }}
              >
                {/* LEFT: image + winrate */}
                <div className="flex flex-col h-full items-center flex-shrink-0">
                  <div className="flex-1 flex items-center pt-3">
                    <img
                      src={champ.image}
                      alt={champ.name}
                      className={`w-25 aspect-square object-cover rounded
                        ${completed ? "border-4 border-green-500" : "border-4 border-gray-600"}`}
                    />
                  </div>

                  <span className="text-md text-gray-300">
                    {winrate !== undefined
                      ? `${(winrate * 100).toFixed(1)}%`
                      : "—"}
                  </span>
                </div>

                {/* RIGHT: summoner */}
                <div className="flex-1 min-w-0 flex items-center">
                  <span className="truncate text-lg">
                    {p.Summoner}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* MIDDLE: Options */}
        {initialSelection && (
          <div className="flex flex-1 justify-center items-center">
            <div className="flex gap-4">
              {options.map((c) => {
                const champ = champByKey[c];
                const winrate = getChampWinrate(champ.key) || 0;
                const completed = completedChamps[champ.id] === true;

                return (
                  <div
                    key={champ.id}
                    className={`rounded-lg overflow-hidden flex flex-col items-center
                      ${completed ? "border-4 border-green-500" : "border-4 border-gray-600"}`}
                  >
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${champ.id}_0.jpg`}
                      alt={champ.name}
                      className="h-full object-contain"
                    />

                    <span className="mt-1 text-lg font-bold">
                      {(winrate * 100).toFixed(2)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
