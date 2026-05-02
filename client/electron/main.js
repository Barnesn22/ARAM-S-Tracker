import { app, BrowserWindow, screen, ipcMain } from "electron";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as lcuService from "./lcuService.js";
import pkg from 'electron-updater'
import log from 'electron-log'
const { autoUpdater } = pkg;

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

let win;

// Compute __dirname manually
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Where the JSON file will live
const dataPath = path.join(app.getPath("userData"), "missions.json");

// Read file
function readMissions() {
  try {
    const data = fs.readFileSync(dataPath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return {}; // return empty object if file doesn't exist
  }
}

// Write file
function writeMissions(missions) {
  fs.writeFileSync(dataPath, JSON.stringify(missions, null, 2), "utf-8");
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  win = new BrowserWindow({
    x: 0,
    y: 0,
    width,
    height,
    frame: false,
    icon: path.join(__dirname, "..", "build", "favicon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"), // __dirname points to electron/, // Must point to preload
      contextIsolation: true, // Important for security
      nodeIntegration: false, // Must be false
    },
  });

  if (app.isPackaged) {
    const indexPath = path.join(app.getAppPath(), "dist-vite", "index.html");
    win.loadFile(indexPath);
  } else {
    win.loadURL("http://localhost:5173");
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle("load-missions", () => {
  return readMissions();
});

ipcMain.handle("save-missions", (event, missions) => {
  writeMissions(missions);
  return true;
});

ipcMain.on("window-minimize", () => {
  if (win) win.minimize();
});

ipcMain.on("window-maximize", () => {
  if (win) win.isMaximized() ? win.unmaximize() : win.maximize();
});

ipcMain.on("window-close", () => {
  if (win) win.close();
});

ipcMain.handle("get-champ-select", async () => {
  return await lcuService.getChampSelect();
});

ipcMain.handle("get-game-phase", async () => {
  return await lcuService.getGamePhase();
});

ipcMain.handle("get-player-challenges", async () => {
  return await lcuService.getPlayerChallenges();
});

ipcMain.handle("get-initial-champs", async () => {
  return await lcuService.getInitialChamps();
});

ipcMain.handle("get-my-selection", async () => {
  return await lcuService.getMySelection();
});

ipcMain.handle("get-game-session", async () => {
  return await lcuService.getGameSession();
});

ipcMain.handle("get-current-summoner", async () => {
  return await lcuService.getCurrentSummoner();
});

ipcMain.handle("get-game-events", async () => {
  return await lcuService.getGameEvents();
});

ipcMain.handle("get-player-list", async () => {
  return await lcuService.getPlayerList();
});

ipcMain.handle("get-name", async (event, puuid) => {
  return await lcuService.getName(puuid);
});

// Auto Update on startup - check only, don't download
app.whenReady().then(() => {
  autoUpdater.checkForUpdates();
});

// Manual Update Handlers
ipcMain.handle("check-for-updates", async () => {
  try {
    autoUpdater.checkForUpdates();
    return { success: true, message: "Checking for updates..." };
  } catch (err) {
    return { success: false, message: "Error checking for updates", error: err.message };
  }
});

ipcMain.handle("download-update", async () => {
  try {
    autoUpdater.downloadUpdate();
    return { success: true, message: "Downloading update..." };
  } catch (err) {
    return { success: false, message: "Error downloading update", error: err.message };
  }
});

autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
  if (win) {
    win.webContents.send('update-status', { status: 'checking', message: 'Checking for updates...' });
  }
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available.');
  if (win) {
    win.webContents.send('update-status', { status: 'available', message: 'Update available!', info });
  }
});

autoUpdater.on('update-not-available', (info) => {
  console.log('No update available.');
  if (win) {
    win.webContents.send('update-status', { status: 'not-available', message: 'No update available' });
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded.');
  if (win) {
    win.webContents.send('update-status', { status: 'downloaded', message: 'Update downloaded! Restarting...', info });
  }
  // Auto restart after download
  setTimeout(() => {
    autoUpdater.quitAndInstall();
  }, 2000);
});

autoUpdater.on('download-progress', (progressObj) => {
  console.log('Download progress:', progressObj);
  if (win) {
    win.webContents.send('update-status', { 
      status: 'downloading', 
      message: `Downloading update: ${Math.round(progressObj.percent)}%`,
      progress: progressObj.percent 
    });
  }
});

autoUpdater.on('error', (err) => {
  console.log('Error in auto-updater:', err);
  if (win) {
    win.webContents.send('update-status', { status: 'error', message: 'Error checking for updates', error: err.message });
  }
});