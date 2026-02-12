import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { app, BrowserWindow, shell } from "electron";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDev = !app.isPackaged;
const VITE_DEV_SERVER_URL = "http://localhost:5173"; // Vite default
const APP_URL = "https://app.ignite-chat.com";

// Domains that are considered "internal" and should stay in the app
const INTERNAL_HOSTS = [
  "localhost",
  "app.ignite-chat.com",
  "ignite-chat.com",
];

function isInternalUrl(url) {
  try {
    const parsed = new URL(url);
    return INTERNAL_HOSTS.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
    );
  } catch {
    return true;
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Intercept new-window requests (window.open, target="_blank") — open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!isInternalUrl(url)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  // Intercept in-page navigation to external domains
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isInternalUrl(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
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
