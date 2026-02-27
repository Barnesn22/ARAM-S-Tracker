const ChampionDisplay = ({ champId, champByKey, size = 32 }) => {
  const champ = champByKey[champId];

  if (!champ) return null;

  return (
    <img
      src={champ.image}
      alt={champ.name}
      style={{ width: size, height: size }}
    />
  );
};

export default ChampionDisplay