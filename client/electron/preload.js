const { contextBridge, ipcRenderer } = require("electron");

console.log("Preload script loaded!"); // Debug

contextBridge.exposeInMainWorld("electronAPI", {
  loadMissions: () => ipcRenderer.invoke("load-missions"),
  saveMissions: (missions) => ipcRenderer.invoke("save-missions", missions),
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
  getChampSelect: () => ipcRenderer.invoke("get-champ-select"),
  getPlayerChallenges: () => ipcRenderer.invoke("get-player-challenges"),
  getGamePhase: () => ipcRenderer.invoke("get-game-phase"),
  getInitialChamps: () => ipcRenderer.invoke("get-initial-champs"),
  getMySelection: () => ipcRenderer.invoke("get-my-selection"),
  getGameSession: () => ipcRenderer.invoke("get-game-session"),
  getCurrentSummoner: () => ipcRenderer.invoke("get-current-summoner"),
  getGameEvents: () => ipcRenderer.invoke("get-game-events"),
  getName: (puuid) => ipcRenderer.invoke("get-name", puuid),
  getPlayerList: () => ipcRenderer.invoke("get-player-list"),
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  downloadUpdate: () => ipcRenderer.invoke("download-update"),
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', (event, data) => callback(data)),
  removeUpdateListener: () => ipcRenderer.removeAllListeners('update-status'),
  fetchSummonerInfo: (gameName, tagLine) => ipcRenderer.invoke("fetch-summoner-info", gameName, tagLine),
  fetchMatchHistory: (puuid, numMatches) => ipcRenderer.invoke("fetch-match-history", puuid, numMatches),
  // Environment variables
  getEnvVar: (key) => process.env[key] || null,
  // Zoom controls
  zoomIn: () => ipcRenderer.send("zoom-in"),
  zoomOut: () => ipcRenderer.send("zoom-out"),
  zoomReset: () => ipcRenderer.send("zoom-reset")
});

