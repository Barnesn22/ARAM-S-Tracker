import ChampionDisplay from "./ChampionDisplay";

const SmallParticipant = ({ participant, champByKey }) => {
    
  return (
    <div className="flex items-center gap-2 text-xs w-[120px]">
      <ChampionDisplay
        champId={participant.champ_id}
        champByKey={champByKey}
        size={20}
      />
      <span className="text-white truncate">
        {participant.summoners.summoner_name}
      </span>
    </div>
  );
};

export default SmallParticipant;