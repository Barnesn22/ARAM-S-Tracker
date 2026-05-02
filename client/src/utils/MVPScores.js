function calculateMVPScores(events, playerlist) {
  const FIGHT_WINDOW = 20; // seconds between kills to stay in same fight
  const scores = Object.fromEntries(
    playerlist.map(player => [
      player.riotIdGameName,
      0
    ])
  );
  const deathCounts = {}; // track deaths for alive imbalance approximation

  function ensurePlayer(name) {
    if (!scores[name]) scores[name] = 0;
    if (!deathCounts[name]) deathCounts[name] = 0;
  }

  // -----------------------------
  // 1. Extract kill events only
  // -----------------------------
  const kills = events.filter(
    e => e.EventName === "ChampionKill" || e.EventName === "FirstBlood"
  );

  // -----------------------------
  // 2. Cluster ChampionKill events into fights
  // -----------------------------
  const fights = [];
  let currentFight = [];

  for (const event of kills) {
    if (event.EventName !== "ChampionKill") continue;

    if (
      currentFight.length === 0 ||
      event.EventTime - currentFight[currentFight.length - 1].EventTime <= FIGHT_WINDOW
    ) {
      currentFight.push(event);
    } else {
      fights.push(currentFight);
      currentFight = [event];
    }
  }

  if (currentFight.length) fights.push(currentFight);

  // -----------------------------
  // 3. Score each fight
  // -----------------------------
  for (const fight of fights) {

    const participants = {};
    let fightKills = fight.length;

    for (let i = 0; i < fight.length; i++) {
      const event = fight[i];

      const killer = event.KillerName;
      const victim = event.VictimName;
      const assisters = event.Assisters || [];

      ensurePlayer(killer);
      ensurePlayer(victim);

      participants[killer] = participants[killer] || { kills:0, assists:0 };
      participants[killer].kills += 1;

      for (const a of assisters) {
        ensurePlayer(a);
        participants[a] = participants[a] || { kills:0, assists:0 };
        participants[a].assists += 1;
      }

      deathCounts[victim] += 1;
    }

    // -----------------------------
    // Fight uncertainty discount
    // Approximate cleanup discount:
    // more kills later in same fight -> worth less
    // -----------------------------
    const burstFactor = fightKills;
    const fightWeight = 1 / (1 + 0.5 * burstFactor);

    // -----------------------------
    // Tempo weighting (earlier fights worth more)
    // -----------------------------
    const t = fight[0].EventTime;
    const tempoWeight = Math.exp(-t / 600);

    // -----------------------------
    // Compute contribution shares
    // P_i = kills + .5 assists
    // -----------------------------
    let totalP = 0;

    for (const p in participants) {
      participants[p].P =
        participants[p].kills +
        0.5 * participants[p].assists;

      totalP += participants[p].P;
    }

    const fightReward = 20 * fightWeight * tempoWeight;

    for (const p in participants) {
      const share = participants[p].P / totalP;

      scores[p] += fightReward * share;
    }

    // -----------------------------
    // Death penalties
    // earlier deaths hurt more
    // -----------------------------
    for (const event of fight) {
      const victim = event.VictimName;

      const deathPenalty =
        -8 * Math.exp(-event.EventTime / 300);

      scores[victim] += deathPenalty;
    }
  }

  // -----------------------------
  // 4. First Blood bonuses
  // -----------------------------
  for (const event of events) {
    if (event.EventName === "FirstBlood") {
      const p = event.Recipient;
      ensurePlayer(p);
      scores[p] += 5;
    }
  }

  const vals = Object.values(scores);

if (vals.length) {

  const mean =
    vals.reduce((a,b) => a+b,0) / vals.length;

  const variance =
    vals.reduce(
      (sum,v) => sum + Math.pow(v - mean,2),
      0
    ) / vals.length;

  const std = Math.sqrt(variance);

  for (const p in scores) {

    // z-score
    const z =
      std === 0
      ? 0
      : (scores[p] - mean) / std;

    // Soft normalization:
    // average player = 50
    // ~1 std above = 65
    // ~2 std above = 80
    let rating = 50 + 15 * z;

    // optional cap
    rating = Math.max(
      0,
      Math.min(100, rating)
    );

    scores[p] = Math.round(rating);
  }
}
  return scores;
}

export default calculateMVPScores;