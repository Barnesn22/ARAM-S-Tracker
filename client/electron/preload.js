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
});

