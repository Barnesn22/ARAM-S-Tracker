import TeamChampCard from "./TeamChampCard";
import CenterChampView from "./CenterChampView";
import { getWinrate } from "../utils/gameUtils";

export default function InGame({ 
  player, 
  teamOne, 
  teamTwo, 
  scores, 
  itemWR, 
  augmentsByRarity, 
  winrates, 
  champByKey, 
  completedChamps 
}) {
  if (!player || !player.championId) {
    return <div>Loading...</div>;
  }

  const playerChamp = champByKey[player.championId];
  const winrate = getWinrate(player.championId, winrates) || 0;

  return (
    <div className="flex w-full h-screen bg-[#1e1e2f] text-[#f0f0f0]">

      {/* LEFT TEAM */}
      <div className="w-[20%] flex flex-col gap-3 p-4">
        {teamOne.map(participant => (
          <TeamChampCard 
            champ={champByKey[participant.championId]} 
            player={player}
            scores={scores}
            name={participant.riotIdGameName} 
          />
        ))}
      </div>

      {/* CENTER */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <CenterChampView 
          champ={playerChamp}
          itemWR={itemWR}
          augmentsByRarity={augmentsByRarity} 
          winrate={winrate}
        />
      </div>

      {/* RIGHT TEAM */}
      <div className="w-[20%] flex flex-col gap-3 p-4 items-end">
        {teamTwo.map(participant => (
          <TeamChampCard 
            champ={champByKey[participant.championId]}
            player={player}
            align="right"
            scores={scores}
            name={participant.riotIdGameName} 
          />
        ))}
      </div>

    </div>
  );
}
