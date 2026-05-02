function TeamChampCard({
  champ,
  align = "left",
  player,
  scores,
  name
}) {
  console.log("scores: ", scores)
  return (
    <div
      className={`h-[15%] flex items-center gap-3 bg-[#2a2a3a] p-2 rounded-lg w-full
        ${parseInt(champ.key) === player.championId ? "border-2 border-green-500" : ""}
        ${align === "right" ? "flex-row-reverse text-right" : ""}`}
    >
      <img
        src={champ.image}
        alt={champ.name}
        className="w-20 h-20 rounded object-cover"
      />

      <div className="flex flex-col min-w-0">
        <span className="truncate text-sm font-semibold">
          {champ.name}
        </span>

        <span className="truncate text-xs text-gray-300">
          {name}
        </span>

        <span className="text-xs text-yellow-400">
          MVP Score: {scores?.[name] ?? "--"}
        </span>
      </div>
    </div>
  );
}

export default TeamChampCard;