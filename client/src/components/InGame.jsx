import TeamChampCard from "./TeamChampCard";
import CenterChampView from "./CenterChampView";
import { getWinrate } from "../utils/gameUtils";

export default function InGame({ 
  player, 
  teamOne, 
  teamTwo, 
  scores, 
  winrates, 
  champByKey, 
  itemMap,
  augmentMap
}) {
  if (!player || !player.championId) {
    return <div>Loading...</div>;
  }

  const playerChamp = champByKey[player.championId];
  const winrate = getWinrate(player.championId, winrates) || 0;

  return (
    <div className="flex ml-16 h-screen text-[#f0f0f0] overflow-hidden">

      {/* LEFT TEAM */}
      <div className="hidden lg:flex lg:flex-col lg:gap-4 lg:p-6 lg:justify-center lg:w-[22%]">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-blue-400 mb-2">Team Blue</h3>
          <div className="h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
        </div>
        <div className="flex flex-col gap-4">
          {teamOne.map((participant, index) => (
            <div key={participant.championId} className="transform h-[20%] transition-all duration-300 hover:scale-105">
              <TeamChampCard 
                champ={champByKey[participant.championId]} 
                player={player}
                scores={scores}
                name={participant.riotIdGameName} 
              />
            </div>
          ))}
        </div>
      </div>

      {/* CENTER */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-8">
        <div className="w-full">
          <CenterChampView 
            champ={playerChamp}
            winrate={winrate}
            itemMap={itemMap}
            augmentMap={augmentMap}
          />
        </div>
      </div>

      {/* RIGHT TEAM */}
      <div className="hidden lg:flex lg:flex-col lg:gap-4 lg:p-6 lg:justify-center lg:w-[22%]">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-red-400 mb-2">Team Red</h3>
          <div className="h-px bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
        </div>
        <div className="flex flex-col gap-3">
          {teamTwo.map((participant, index) => (
            <div key={participant.championId} className="transform h-[20%]transition-all duration-300 hover:scale-105">
              <TeamChampCard 
                champ={champByKey[participant.championId]}
                player={player}
                align="right"
                scores={scores}
                name={participant.riotIdGameName} 
              />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
