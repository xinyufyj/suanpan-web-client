'use strict'
import { app, protocol, BrowserWindow, ipcMain } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import logger from './log'
import { isDevelopment } from './utils'
import { getWebOrigin, launchSuanpanServer, findPort, checkServerSuccess } from './suanpan'

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

let win = null, splashWin = null;
async function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: 1400,
    minWidth: 1024,
    height: 900,
    minHeight: 600,
    titleBarStyle: "hidden",
    title: '雪浪算盘',
    show: false,
    webPreferences: {
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
      contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
      webSecurity: false,
    }
  })
  win.setMenuBarVisibility(false);
  win.once("ready-to-show", () => {
    splashWin.destroy();
    splashWin = null;
    win.show();
    if (process.env.WEBPACK_DEV_SERVER_URL && !process.env.IS_TEST)
      win.webContents.openDevTools();
  });
  win.loadURL(getWebOrigin());

  win.webContents.on(
    "new-window",
    async (event, url, frameName, disposition, options, additionalFeatures) => {
      event.preventDefault();
      logger.info('new-window url:', url);
      Object.assign(options, {
        titleBarStyle: "default",
        frame: true,
      });
      event.newGuest = new BrowserWindow({
        ...options,
        width: 1024,
        height: 600,
      });
      event.newGuest.setMenuBarVisibility(false);
      event.newGuest.loadURL(url);
    }
  );
}

function createSplashWindow() {
  splashWin = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    resizable: false,
    show: false,
    // alwaysOnTop: true,
    webPreferences: {
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
      webSecurity: false,
    },
  });
  splashWin.once("ready-to-show", () => {
    splashWin.show();
  });
  if (process.env.WEBPACK_DEV_SERVER_URL) {
    splashWin.loadURL(process.env.WEBPACK_DEV_SERVER_URL + 'splash.html');
  } else {
    splashWin.loadURL(`app://./splash.html`);
  }
}
// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on("will-quit", async (event) => {
  event.preventDefault();
  process.exit(0);
});

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}

/**
 * SingleInstanceLock
 */
 const gotTheLock = app.requestSingleInstanceLock();

 if (!gotTheLock) {
   app.quit();
 } else {
   app.on("second-instance", (event, commandLine, workingDirectory) => {
     // Someone tried to run a second instance, we should focus our window.
     if (win) {
       if (win.isMinimized()) win.restore();
       win.focus();
     }
   });
   app.on("ready", async () => {
     if(!isDevelopment) {
      createProtocol('app');
     }
     createSplashWindow();
     let port = findPort();
     try {
       await launchSuanpanServer();
       await checkServerSuccess(port);
       createWindow();
     } catch (e) {
      logger.error(`launch failed ${e.message}\n${e.stack}`);
      process.exit(-1);
     }
   });
 }