import React from "react";
import MatchCard from "./MatchCard.jsx";

const MatchHistory = React.memo(({ matches = [], champByKey }) => {
  return (
    <div>
      {matches.map(match => (
        <MatchCard key={match.match_id} match={match} champByKey={champByKey} />
      ))}
    </div>
  );
});

export default MatchHistory;