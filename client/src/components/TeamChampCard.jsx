function TeamChampCard({
  champ,
  align = "left",
  player,
  scores,
  name
}) {
  const isPlayer = parseInt(champ.key) === player.championId;
  const score = scores?.[name];
  
  return (
    <div
      className={`h-full flex items-center gap-3 bg-gradient-to-r from-[#2a2a3a] to-[#333344] p-3 rounded-xl w-full shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:from-[#333344] hover:to-[#3a3a4a]
        ${isPlayer ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#1a1a2e]" : ""}
        ${align === "right" ? "flex-row-reverse text-right" : ""}`}
    >
      <div className="relative">
        <img
          src={champ.image}
          alt={champ.name}
          className="w-16 h-16 rounded-lg object-cover border-2 border-[#4a4a5a] shadow-md"
        />
        {isPlayer && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#1a1a2e] animate-pulse"></div>
        )}
      </div>

      <div className="flex flex-col min-w-0 flex-1">
        <span className="truncate text-sm font-bold text-white mb-1">
          {champ.name}
        </span>

        <span className="truncate text-xs text-gray-400 mb-1">
          {name}
        </span>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-yellow-400">
            MVP: {score ?? "--"}
          </span>
          {score && score > 50 && (
            <span className="text-xs text-orange-400">⭐</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeamChampCard;