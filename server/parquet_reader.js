const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const REPO_ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(REPO_ROOT, 'data');
const MANIFEST_PATH = path.join(DATA_DIR, 'manifest.json');

let hyparquetPromise = null;
function loadHyparquet() {
  if (!hyparquetPromise) {
    hyparquetPromise = Promise.all([
      import('hyparquet'),
      import('hyparquet-compressors'),
    ]).then(([hq, hc]) => ({
      asyncBufferFromFile: hq.asyncBufferFromFile,
      parquetReadObjects: hq.parquetReadObjects,
      compressors: hc.compressors,
    }));
  }
  return hyparquetPromise;
}

let cachedStore = null;
let loadPromise = null;

async function readManifestTable(tableName, manifest) {
  const table = manifest?.tables?.[tableName];
  if (!table || !Array.isArray(table.files) || table.files.length === 0) {
    return [];
  }

  const { asyncBufferFromFile, parquetReadObjects, compressors } = await loadHyparquet();
  const chunks = await Promise.all(
    table.files.map(async (file) => {
      const filePath = path.join(DATA_DIR, file.path);
      if (!fs.existsSync(filePath)) return [];
      const asyncBuffer = await asyncBufferFromFile(filePath);
      return parquetReadObjects({ file: asyncBuffer, compressors });
    })
  );
  return chunks.flat();
}

function buildIndexes(matches, participants, summoners, generatedAt) {
  const matchesById = new Map();
  for (const m of matches) {
    matchesById.set(String(m.match_id), m);
  }

  const summonersByPuuid = new Map();
  for (const s of summoners) {
    summonersByPuuid.set(String(s.puuid), s);
  }

  const participantsByMatchId = new Map();
  const participantsByPuuid = new Map();
  const participantsByChampId = new Map();

  participants.forEach((raw, idx) => {
    const p = {
      ...raw,
      id: `${raw.match_id}:${raw.puuid}:${idx}`,
      match_id: String(raw.match_id),
      puuid: String(raw.puuid),
      champ_id: Number(raw.champ_id),
      team_id: Number(raw.team_id),
      win: Boolean(raw.win),
      items: Array.isArray(raw.items) ? raw.items.map(Number).filter((id) => id > 0) : [],
      augments: Array.isArray(raw.augments) ? raw.augments.map(Number).filter((id) => id > 0) : [],
    };

    if (!participantsByMatchId.has(p.match_id)) participantsByMatchId.set(p.match_id, []);
    participantsByMatchId.get(p.match_id).push(p);

    if (!participantsByPuuid.has(p.puuid)) participantsByPuuid.set(p.puuid, []);
    participantsByPuuid.get(p.puuid).push(p);

    if (!participantsByChampId.has(p.champ_id)) participantsByChampId.set(p.champ_id, []);
    participantsByChampId.get(p.champ_id).push(p);
  });

  // Precompute champion stats
  const totalParticipants = participants.length;
  const champStats = [];
  const champStatsById = new Map();
  for (const [champId, rows] of participantsByChampId.entries()) {
    const games = rows.length;
    const wins = rows.reduce((acc, r) => acc + (r.win ? 1 : 0), 0);
    const entry = {
      champ_id: champId,
      games,
      winrate: games > 0 ? wins / games : 0,
      playrate: totalParticipants > 0 ? games / totalParticipants : 0,
    };
    champStats.push(entry);
    champStatsById.set(champId, entry);
  }
  champStats.sort((a, b) => b.games - a.games);

  const sortedMatches = [...matches].sort((a, b) => {
    const ta = a.game_creation ? new Date(a.game_creation).getTime() : 0;
    const tb = b.game_creation ? new Date(b.game_creation).getTime() : 0;
    return tb - ta;
  });

  return {
    generatedAt,
    matches: sortedMatches,
    summoners,
    matchesById,
    summonersByPuuid,
    participantsByMatchId,
    participantsByPuuid,
    participantsByChampId,
    champStats,
    champStatsById,
  };
}

async function getStore(forceReload = false) {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return buildIndexes([], [], [], null);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  const generatedAt = manifest.generated_at || null;

  if (!forceReload && cachedStore && cachedStore.generatedAt === generatedAt) {
    return cachedStore;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      const [matches, participants, summoners] = await Promise.all([
        readManifestTable('matches', manifest),
        readManifestTable('participants', manifest),
        readManifestTable('summoners', manifest),
      ]);
      cachedStore = buildIndexes(matches, participants, summoners, generatedAt);
      return cachedStore;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

async function ingestMatchJsons(matchJsons) {
  if (!Array.isArray(matchJsons) || matchJsons.length === 0) return 0;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aram-ingest-'));
  try {
    matchJsons.forEach((mj, idx) => {
      fs.writeFileSync(path.join(tmpDir, `match_${idx}.json`), JSON.stringify(mj), 'utf-8');
    });

    const scriptPath = path.join(__dirname, 'injestion_to_parquet.py');
    const pythonBin = process.env.PYTHON_PATH || 'python';
    await execFileAsync(pythonBin, [scriptPath, tmpDir, '--repo', REPO_ROOT]);
    await getStore(true);
    return matchJsons.length;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

module.exports = {
  getStore,
  ingestMatchJsons,
};
