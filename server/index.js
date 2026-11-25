const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { fetchSummonerInfo, fetchMatchHistory, fetchMatchDetails } = require('./lcuService');
const { getStore, ingestMatchJsons } = require('./parquet_reader');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

function toArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function withSummoner(participant, store) {
  const summoner = store.summonersByPuuid.get(participant.puuid);
  return {
    ...participant,
    summoner_name: summoner?.summoner_name ?? null,
    region: summoner?.region ?? null,
  };
}

function aggregateByKey(rows, extractKeys, minGames = 0) {
  const map = new Map();
  for (const row of rows) {
    const uniqueKeys = new Set(extractKeys(row));
    for (const key of uniqueKeys) {
      let entry = map.get(key);
      if (!entry) {
        entry = { key, games: 0, wins: 0 };
        map.set(key, entry);
      }
      entry.games += 1;
      if (row.win) entry.wins += 1;
    }
  }
  return Array.from(map.values())
    .filter((e) => e.games >= minGames)
    .map((e) => ({
      key: e.key,
      games: e.games,
      winrate: e.games > 0 ? e.wins / e.games : 0,
    }))
    .sort((a, b) => b.games - a.games);
}

// ==================================================================
// Matches & Participants
// ==================================================================
app.get('/api/matches', async (req, res) => {
  try {
    const store = await getStore();
    const limit = Number(req.query.limit) || 50;
    const results = store.matches.slice(0, limit).map((m) => ({
      ...m,
      participant_count: (store.participantsByMatchId.get(String(m.match_id)) || []).length,
    }));
    res.json(results);
  } catch (err) {
    console.error('Error fetching matches:', err);
    res.status(500).json({ error: 'Failed to read matches', details: err.message });
  }
});

app.get('/api/matches/:match_id/participants', async (req, res) => {
  try {
    const store = await getStore();
    const participants = (store.participantsByMatchId.get(String(req.params.match_id)) || [])
      .map((p) => withSummoner(p, store));
    res.json(participants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/matches/:match_id/participants/:participant_id/items', async (req, res) => {
  try {
    const store = await getStore();
    const { match_id, participant_id } = req.params;
    const participants = store.participantsByMatchId.get(String(match_id)) || [];
    const target = participants.find(
      (p) => p.id === participant_id || p.puuid === participant_id
    );
    const items = (target?.items || [])
      .slice()
      .sort((a, b) => a - b)
      .map((item_id) => ({ item_id }));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/matches/:match_id/participants/:participant_id/augments', async (req, res) => {
  try {
    const store = await getStore();
    const { match_id, participant_id } = req.params;
    const participants = store.participantsByMatchId.get(String(match_id)) || [];
    const target = participants.find(
      (p) => p.id === participant_id || p.puuid === participant_id
    );
    const augments = (target?.augments || [])
      .slice()
      .sort((a, b) => a - b)
      .map((augment_id) => ({ augment_id }));
    res.json(augments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/matches/:match_id/participants-with-items', async (req, res) => {
  try {
    const store = await getStore();
    const participants = (store.participantsByMatchId.get(String(req.params.match_id)) || [])
      .slice()
      .sort((a, b) => a.team_id - b.team_id)
      .map((p) => withSummoner(p, store));
    res.json(participants);
  } catch (err) {
    console.error('Error fetching participants with items:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================================================================
// Summoners & Ingestion
// ==================================================================
app.get('/api/summoners/:puuid', async (req, res) => {
  try {
    const store = await getStore();
    const summoner = store.summonersByPuuid.get(String(req.params.puuid));
    if (!summoner) {
      return res.json(null);
    }
    const games = store.participantsByPuuid.get(String(req.params.puuid)) || [];
    res.json({
      ...summoner,
      total_matches: games.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/summoners/:puuid/games', async (req, res) => {
  try {
    const store = await getStore();
    const rows = store.participantsByPuuid.get(String(req.params.puuid)) || [];
    const games = rows
      .map((p) => {
        const match = store.matchesById.get(p.match_id) || { match_id: p.match_id };
        return {
          ...match,
          win: p.win,
          kills: p.kills,
          deaths: p.deaths,
          assists: p.assists,
          champ_id: p.champ_id,
          gold_earned: p.gold_earned,
          total_damage_dealt: p.total_damage_dealt,
          pentakills: p.pentakills,
          team_id: p.team_id,
        };
      })
      .sort((a, b) => {
        const ta = a.game_creation ? new Date(a.game_creation).getTime() : 0;
        const tb = b.game_creation ? new Date(b.game_creation).getTime() : 0;
        return tb - ta;
      });
    res.json(games);
  } catch (err) {
    console.error('Error fetching summoner games:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/summoners/:puuid/games/:match_id/participants', async (req, res) => {
  try {
    const store = await getStore();
    const participants = (store.participantsByMatchId.get(String(req.params.match_id)) || [])
      .slice()
      .sort((a, b) => a.team_id - b.team_id)
      .map((p) => withSummoner(p, store));
    res.json(participants);
  } catch (err) {
    console.error('Error fetching match participants:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/summoners/ingest', async (req, res) => {
  const { gameName, tagLine } = req.body;
  if (!gameName || !tagLine) {
    return res.status(400).json({ error: 'gameName and tagLine are required' });
  }

  try {
    const store = await getStore();
    const summoner = await fetchSummonerInfo(gameName, tagLine);
    const puuid = summoner.puuid;

    const matchHistory = await fetchMatchHistory(puuid, 100);
    const games = (matchHistory?.games?.games || []).filter(
      (g) => g.gameMode === 'KIWI' && g.queueId === 2400
    );

    let skippedCount = 0;
    const newMatches = [];

    for (const game of games) {
      if (store.matchesById.has(String(game.gameId))) {
        skippedCount += 1;
        continue;
      }
      try {
        const matchJson = await fetchMatchDetails(game.gameId);
        newMatches.push(matchJson);
      } catch (err) {
        console.error(`Error fetching match details for ${game.gameId}:`, err);
      }
    }

    const ingestedCount = await ingestMatchJsons(newMatches);

    res.json({
      message: 'Ingestion completed',
      gamesFound: games.length,
      gamesIngested: ingestedCount,
      gamesSkipped: skippedCount,
    });
  } catch (error) {
    console.error('Error during ingestion:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================================================================
// Champion Stats
// ==================================================================
app.get('/api/stats/champions', async (req, res) => {
  try {
    const store = await getStore();
    res.json(store.champStats);
  } catch (err) {
    console.error('Champion stats query error:', err);
    res.status(500).json({ error: 'Champion stats query failed', details: err.message });
  }
});

app.post('/api/stats/champions/refresh', async (req, res) => {
  try {
    await getStore(true);
    res.json({ message: 'Champion stats refreshed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats/champions/:champ_id', async (req, res) => {
  try {
    const store = await getStore();
    const entry = store.champStatsById.get(Number(req.params.champ_id)) || null;
    res.json(entry);
  } catch (err) {
    console.error('Champion stats query error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats/champions/:champ_id/items', async (req, res) => {
  try {
    const store = await getStore();
    const rows = store.participantsByChampId.get(Number(req.params.champ_id)) || [];
    const stats = aggregateByKey(rows, (r) => r.items).map((e) => ({
      item_id: e.key,
      games_played: e.games,
      winrate: e.winrate,
    }));
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats/champions/:champ_id/augments', async (req, res) => {
  try {
    const store = await getStore();
    const rows = store.participantsByChampId.get(Number(req.params.champ_id)) || [];
    const stats = aggregateByKey(rows, (r) => r.augments).map((e) => ({
      augment_id: e.key,
      games_played: e.games,
      winrate: e.winrate,
    }));
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function computeMatchupStats(store, champId, sameTeam) {
  const rows = store.participantsByChampId.get(champId) || [];
  const map = new Map();
  let totalPairs = 0;

  for (const p1 of rows) {
    const matchParticipants = store.participantsByMatchId.get(p1.match_id) || [];
    for (const p2 of matchParticipants) {
      if (sameTeam) {
        if (p2.team_id !== p1.team_id || p2.puuid === p1.puuid) continue;
      } else {
        if (p2.team_id === p1.team_id) continue;
      }
      if (p2.champ_id === champId) continue;

      totalPairs += 1;
      let entry = map.get(p2.champ_id);
      if (!entry) {
        entry = { champ_id: p2.champ_id, games_together: 0, wins: 0 };
        map.set(p2.champ_id, entry);
      }
      entry.games_together += 1;
      if (p1.win) entry.wins += 1;
    }
  }

  return Array.from(map.values())
    .filter((e) => e.games_together >= 10)
    .map((e) => ({
      champ_id: e.champ_id,
      games_together: e.games_together,
      target_champ_winrate: e.games_together > 0 ? e.wins / e.games_together : 0,
      playrate: totalPairs > 0 ? e.games_together / totalPairs : 0,
    }));
}

app.get('/api/stats/champions/:champ_id/counters', async (req, res) => {
  try {
    const store = await getStore();
    const champId = Number(req.params.champ_id);
    const results = computeMatchupStats(store, champId, false)
      .sort((a, b) => a.target_champ_winrate - b.target_champ_winrate || b.games_together - a.games_together)
      .slice(0, 20)
      .map((e) => ({
        opponent_champ_id: e.champ_id,
        games_together: e.games_together,
        target_champ_winrate: e.target_champ_winrate,
        playrate: e.playrate,
      }));
    res.json(results);
  } catch (err) {
    console.error('Counters query error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats/champions/:champ_id/synergies', async (req, res) => {
  try {
    const store = await getStore();
    const champId = Number(req.params.champ_id);
    const results = computeMatchupStats(store, champId, true)
      .sort((a, b) => b.target_champ_winrate - a.target_champ_winrate || b.games_together - a.games_together)
      .slice(0, 20)
      .map((e) => ({
        ally_champ_id: e.champ_id,
        games_together: e.games_together,
        target_champ_winrate: e.target_champ_winrate,
        playrate: e.playrate,
      }));
    res.json(results);
  } catch (err) {
    console.error('Synergies query error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================================================================
// Filter Metadata & Data Explorer
// ==================================================================
app.get('/api/champions', async (req, res) => {
  try {
    const store = await getStore();
    res.json(store.champStats.map((c) => ({ champ_id: c.champ_id })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/champion-mapping', async (req, res) => {
  try {
    const store = await getStore();
    const sorted = store.champStats
      .map((c) => ({ champ_id: c.champ_id }))
      .sort((a, b) => a.champ_id - b.champ_id);
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/items', async (req, res) => {
  try {
    const store = await getStore();
    const itemSet = new Set();
    for (const rows of store.participantsByChampId.values()) {
      for (const p of rows) {
        for (const id of p.items) itemSet.add(id);
      }
    }
    res.json(Array.from(itemSet).sort((a, b) => a - b).map((item_id) => ({ item_id })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/augments', async (req, res) => {
  try {
    const store = await getStore();
    const augSet = new Set();
    for (const rows of store.participantsByChampId.values()) {
      for (const p of rows) {
        for (const id of p.augments) augSet.add(id);
      }
    }
    res.json(Array.from(augSet).sort((a, b) => a - b).map((augment_id) => ({ augment_id })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function filterParticipants(store, { champId = null, champFilters = [], itemFilters = [], augmentFilters = [] }) {
  const itemSet = new Set(itemFilters.map(Number));
  const augSet = new Set(augmentFilters.map(Number));
  const champSet = new Set(champFilters.map(Number));

  const baseRows = champId !== null
    ? (store.participantsByChampId.get(Number(champId)) || [])
    : Array.from(store.participantsByChampId.values()).flat();

  return baseRows.filter((p) => {
    if (champId === null && champSet.size > 0 && !champSet.has(p.champ_id)) return false;
    if (itemSet.size > 0 && !p.items.some((id) => itemSet.has(id))) return false;
    if (augSet.size > 0 && !p.augments.some((id) => augSet.has(id))) return false;
    if (champId !== null && champSet.size > 0) {
      const teammates = store.participantsByMatchId.get(p.match_id) || [];
      const hasTeammate = teammates.some(
        (t) => t.team_id === p.team_id && champSet.has(t.champ_id)
      );
      if (!hasTeammate) return false;
    }
    return true;
  });
}

app.get('/api/explorer/items/:champId', async (req, res) => {
  try {
    const store = await getStore();
    const { champId } = req.params;
    const minGames = Number(req.query.minGames || 0);
    const filtered = filterParticipants(store, {
      champId,
      champFilters: toArray(req.query.champions),
      itemFilters: toArray(req.query.items),
      augmentFilters: toArray(req.query.augments),
    });
    res.json(aggregateByKey(filtered, (p) => p.items, minGames));
  } catch (err) {
    console.error('Explorer items query error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/explorer/games/count', async (req, res) => {
  try {
    const store = await getStore();
    const filtered = filterParticipants(store, {
      champFilters: toArray(req.query.champions),
      itemFilters: toArray(req.query.items),
      augmentFilters: toArray(req.query.augments),
    });
    const matchIds = new Set(filtered.map((p) => p.match_id));
    res.json({ total_games: matchIds.size });
  } catch (err) {
    console.error('Games count query error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/explorer/augments/:champId', async (req, res) => {
  try {
    const store = await getStore();
    const { champId } = req.params;
    const minGames = Number(req.query.minGames || 0);
    const filtered = filterParticipants(store, {
      champId,
      itemFilters: toArray(req.query.items),
      augmentFilters: toArray(req.query.augments),
    });
    res.json(aggregateByKey(filtered, (p) => p.augments, minGames));
  } catch (err) {
    console.error('Explorer augments query error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/explorer', async (req, res) => {
  try {
    const store = await getStore();
    const minGames = Number(req.query.minGames || 0);
    const champFilters = toArray(req.query.champions).map(Number);
    const filtered = filterParticipants(store, {
      champFilters,
      itemFilters: toArray(req.query.items),
      augmentFilters: toArray(req.query.augments),
    });

    const filteredTeams = new Set(filtered.map((p) => `${p.match_id}:${p.team_id}`));
    const excludeChamps = new Set(champFilters);
    const champMap = new Map();

    for (const key of filteredTeams) {
      const [matchId, teamIdStr] = key.split(':');
      const teamId = Number(teamIdStr);
      const matchParticipants = store.participantsByMatchId.get(matchId) || [];
      for (const p of matchParticipants) {
        if (p.team_id !== teamId) continue;
        if (excludeChamps.size > 0 && excludeChamps.has(p.champ_id)) continue;

        let entry = champMap.get(p.champ_id);
        if (!entry) {
          entry = { key: p.champ_id, matches: new Set(), wins: 0, games: 0 };
          champMap.set(p.champ_id, entry);
        }
        if (!entry.matches.has(matchId)) {
          entry.matches.add(matchId);
          entry.games += 1;
          if (p.win) entry.wins += 1;
        }
      }
    }

    const results = Array.from(champMap.values())
      .filter((e) => e.games >= minGames)
      .map((e) => ({
        key: e.key,
        games: e.games,
        winrate: e.games > 0 ? e.wins / e.games : 0,
      }))
      .sort((a, b) => b.games - a.games);

    res.json(results);
  } catch (err) {
    console.error('Explorer query error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('ARAM Tracker API is running');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
