const ProfileStats = ({ stats = {} }) => {
  console.log(stats)
  return (
    <div className="profile-stats">
      <h2>Stats</h2>
      <p>Win Rate: {(stats.winrate*100).toFixed(2)}%</p>
      <p>Games Played: {stats.games_played}</p>
    </div>
  );
};

export default ProfileStats;