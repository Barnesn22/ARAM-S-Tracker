const { contextBridge, ipcRenderer } = require("electron");

console.log("Preload script loaded!"); // Debug

contextBridge.exposeInMainWorld("electronAPI", {
  loadMissions: () => ipcRenderer.invoke("load-missions"),
  saveMissions: (missions) => ipcRenderer.invoke("save-missions", missions),
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
});

