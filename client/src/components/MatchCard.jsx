import { useState } from "react";
import ChampionDisplay from "./ChampionDisplay.jsx";
import SmallParticipant from "./SmallParticipant.jsx";

const MatchCard = ({ match, champByKey }) => {
  const [expanded, setExpanded] = useState(false);
  const player = match.player;

  const team1 = match.participants.filter(p => p.team_id === 100);
  const team2 = match.participants.filter(p => p.team_id === 200);

  function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${mins}:${secs.toString().padStart(2, "0")}`;
    }

  return (
    <div className={`flex flex-col rounded-lg overflow-hidden my-3 ${player.win ? "bg-blue-900/30" : "bg-red-900/30"}`}>
      
      {/* CLICKABLE COLLAPSED VIEW */}
      <div className="match-summary" onClick={() => setExpanded(!expanded)}>
        
        {/* Result Bar */}
        <div className="result-bar" />

        {/* Game Info */}
        <div className="game-info">
          <div>{match.queue_type}</div>
          <div>{formatDuration(match.game_duration)}</div>
        </div>

        {/* Big Champion + KDA */}
        <div className="main-player">
          <div className="big-champ">
            <ChampionDisplay
              champId={player.champ_id}
              champByKey={champByKey}
              size={64}
            />
          </div>

          <div className="kda">
            <div className="kda-score">
              {player.kills}/{player.deaths}/{player.assists}
            </div>
            <div className="damage">
              {player.total_damage_dealt.toLocaleString()} dmg
            </div>
          </div>
        </div>

        {/* Team Columns */}
        <div className="teams">
          <div className="team-column">
            {team1.map(p => (
              <SmallParticipant
                key={p.puuid}
                participant={p}
                champByKey={champByKey}
              />
            ))}
          </div>

          <div className="team-column">
            {team2.map(p => (
              <SmallParticipant
                key={p.puuid}
                participant={p}
                champByKey={champByKey}
              />
            ))}
          </div>
        </div>

      </div>

      {/* EXPANDED VIEW (placeholder) */}
      {expanded && (
        <div className="match-details">
          Detailed stats coming here later
        </div>
      )}

    </div>
  );
};

export default MatchCard;