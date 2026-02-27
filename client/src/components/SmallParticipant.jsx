import ChampionDisplay from "./ChampionDisplay";

const SmallParticipant = ({ participant, champByKey }) => {
    
  return (
    <div className="small-participant">
      <ChampionDisplay
        champId={participant.champ_id}
        champByKey={champByKey}
        size={20}
      />
      <span className="summoner-name">
        {participant.summoners.summoner_name}
      </span>
    </div>
  );
};

export default SmallParticipant;