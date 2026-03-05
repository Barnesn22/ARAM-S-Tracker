const ProfileStats = ({ stats = {} }) => {
  console.log(stats)
  return (
    <div className="w-1/4 border border-accent p-4 mr-4 bg-secondary rounded-lg self-start">
      <h2>Stats</h2>
      <p>Win Rate: {(stats.winrate*100).toFixed(2)}%</p>
      <p>Games Played: {stats.games_played}</p>
    </div>
  );
};

export default ProfileStats;