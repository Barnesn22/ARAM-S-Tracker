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
    icon: path.join(__dirname, "..", "public", "favicon.ico"),
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

// Auto Update

app.whenReady().then(() => {
  autoUpdater.checkForUpdatesAndNotify();
});

autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
});

autoUpdater.on('update-available', () => {
  console.log('Update available.');
});

autoUpdater.on('update-not-available', () => {
  console.log('No update available.');
});

autoUpdater.on('error', (err) => {
  console.log('Error in auto-updater:', err);
});