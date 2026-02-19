import { app, BrowserWindow, screen } from "electron";
import { ipcMain } from "electron";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
    icon: path.join(__dirname, "..", "assets", "favicon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"), // __dirname points to electron/, // Must point to preload
      contextIsolation: true, // Important for security
      nodeIntegration: false, // Must be false
    },
  });

  win.loadURL("http://localhost:5173");
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

