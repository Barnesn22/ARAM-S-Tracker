export const getWinrate = (champId, winrates) => {
  const champ = winrates.find(c => c.champ_id === Number(champId));
  return champ ? champ.winrate : 0;
};
