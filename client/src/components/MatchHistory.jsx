import { useState } from "react";
import MatchCard from "./MatchCard.jsx";

const MatchHistory = ({ matches = [], champByKey }) => {
  console.log(matches)
  return (
    <div>
      {matches.map(match => (
        <MatchCard key={match.match_id} match={match} champByKey={champByKey} />
      ))}
    </div>
  );
};

export default MatchHistory;