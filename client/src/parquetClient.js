import { asyncBufferFromUrl, parquetReadObjects } from 'hyparquet';
import { compressors } from 'hyparquet-compressors';

const GITHUB_REPO = import.meta.env?.VITE_GITHUB_REPO || 'Barnesn22/ARAM-S-Tracker';
const GITHUB_BRANCH = import.meta.env?.VITE_GITHUB_BRANCH || 'main';

const MANIFEST_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/data/manifest.json`;
const LFS_MEDIA_BASE_URL = `https://media.githubusercontent.com/media/${GITHUB_REPO}/${GITHUB_BRANCH}/data`;

/**
 * Fetch the dataset manifest from GitHub.
 */
export async function fetchManifest() {
  const response = await fetch(MANIFEST_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch manifest (${response.status}): ${MANIFEST_URL}`);
  }
  return response.json();
}

/**
 * Read rows from a Parquet table stored in GitHub LFS via manifest.json.
 */
export async function readParquetTable(tableName, { columns, patch } = {}) {
  const manifest = await fetchManifest();
  const table = manifest?.tables?.[tableName];
  if (!table || !Array.isArray(table.files) || table.files.length === 0) {
    return [];
  }

  const files = patch
    ? table.files.filter((file) => file.patch === patch)
    : table.files;

  const chunks = await Promise.all(
    files.map(async (file) => {
      const url = `${LFS_MEDIA_BASE_URL}/${file.path}`;
      const asyncBuffer = await asyncBufferFromUrl({
        url,
        ...(typeof file.bytes === 'number' ? { byteLength: file.bytes } : {}),
      });
      return parquetReadObjects({
        file: asyncBuffer,
        compressors,
        ...(columns ? { columns } : {}),
      });
    })
  );

  return chunks.flat();
}

/**
 * Compute per-champion winrate and playrate from the participants Parquet table.
 * Matches the shape previously returned by the Supabase `champion_stats` table.
 */
export async function fetchChampionStats({ patch } = {}) {
  const rows = await readParquetTable('participants', {
    columns: ['champ_id', 'win'],
    patch,
  });

  const statsByChamp = new Map();
  let totalGames = 0;

  for (const row of rows) {
    const champId = Number(row.champ_id);
    if (!Number.isFinite(champId)) continue;

    totalGames += 1;
    let entry = statsByChamp.get(champId);
    if (!entry) {
      entry = { champ_id: champId, games: 0, wins: 0 };
      statsByChamp.set(champId, entry);
    }
    entry.games += 1;
    if (row.win) {
      entry.wins += 1;
    }
  }

  return Array.from(statsByChamp.values())
    .map((entry) => ({
      champ_id: entry.champ_id,
      games: entry.games,
      wins: entry.wins,
      winrate: entry.games > 0 ? entry.wins / entry.games : 0,
      playrate: totalGames > 0 ? entry.games / totalGames : 0,
    }))
    .sort((a, b) => b.winrate - a.winrate);
}
