const { exec } = require('child_process');
const axios = require('axios');
const https = require('https');

let credentialsCache = null;

/**
 * Extract LCU port + token from LeagueClientUx process
 */
function getLCUCredentials() {
  return new Promise((resolve, reject) => {
    if (credentialsCache) return resolve(credentialsCache);
    exec(
      `powershell "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'LeagueClientUx.exe' } | Select-Object -ExpandProperty CommandLine"`,
      (error, stdout) => {
        if (error || !stdout) {
          return reject("League client not running");
        }

        const portMatch = stdout.match(/--app-port=(\d+)/);
        const tokenMatch = stdout.match(/--remoting-auth-token=([\w-]+)/);

        if (!portMatch || !tokenMatch) {
          return reject("Could not extract LCU credentials");
        }

        credentialsCache = {
          port: portMatch[1],
          token: tokenMatch[1],
        };

        resolve(credentialsCache);
      }
    );
  });
}

async function lcuRequest(path) {
  const { port, token } = await getLCUCredentials();

  const agent = new https.Agent({
    rejectUnauthorized: false,
  });

  const response = await axios.get(
    `https://127.0.0.1:${port}${path}`,
    {
      httpsAgent: agent,
      auth: {
        username: "riot",
        password: token,
      },
    }
  );
  return response.data;
}

/**
 * Fetch summoner info by game name and tag line
 */
async function fetchSummonerInfo(gameName, tagLine) {
  const res = await lcuRequest(`/lol-summoner/v1/alias/lookup?gameName=${encodeURIComponent(gameName)}&tagLine=${encodeURIComponent(tagLine)}`);
  return res;
}

/**
 * Fetch match history for a summoner
 */
async function fetchMatchHistory(puuid, numMatches) {
  const res = await lcuRequest(`/lol-match-history/v1/products/lol/${puuid}/matches?endIndex=${numMatches-1}`);
  return res;
}

/**
 * Fetch individual match details by match ID
 */
async function fetchMatchDetails(matchId) {
  const res = await lcuRequest(`/lol-match-history/v1/games/${matchId}`);
  return res;
}

module.exports = {
  fetchSummonerInfo,
  fetchMatchHistory,
  fetchMatchDetails,
  getLCUCredentials
};
