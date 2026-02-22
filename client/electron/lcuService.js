import { exec } from "child_process";
import axios from "axios";
import https from "https";

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
 * Get champ select session
 */
async function getChampSelect() {
  try {
    const res = await lcuRequest("/lol-champ-select/v1/session");
    return res;
  } catch (err) {
    return null;
  }
  
}

/**
 * Get current game phase
 */
async function getGamePhase() {
  return await lcuRequest("/lol-gameflow/v1/gameflow-phase");
}

/**
 * Get player challenges
 */
async function getPlayerChallenges() {
  return await lcuRequest("/lol-challenges/v1/challenges/local-player");
}

export  {
  getChampSelect,
  getGamePhase,
  getPlayerChallenges,
};