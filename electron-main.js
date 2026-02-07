import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { app, BrowserWindow } from "electron";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDev = !app.isPackaged;
const VITE_DEV_SERVER_URL = "http://localhost:5173"; // Vite default
const APP_URL = "https://app.ignite-chat.com";

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
    },
  });

  if (isDev) {
    // DEV: load Vite dev server
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    // PROD: load ignite app
    mainWindow.loadURL(APP_URL);
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
