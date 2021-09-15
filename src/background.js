'use strict'
import { app, protocol, BrowserWindow, ipcMain } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import path from 'path'
import logger from './log'
import { isDevelopment } from './utils'
import { getWebOrigin, launchSuanpanServer, findPort, checkServerSuccess, killSuanpanServer, reportEnvInfo, getVersion } from './suanpan'
import './downloadApi'

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

let win = null, splashWin = null;
let mainWinId = null;

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
      contextIsolation: false,
      webSecurity: false,
      preload: path.join(__dirname, "preload.js"),
    }
  })
  mainWinId = win.id;
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
      let urlObj = new URL(url);
      let urlId = url;
      if(urlObj.pathname.startsWith('/run/log/')) {
        // oss log
        urlId = `${urlObj.origin}/run/log/`;
      }else if(urlObj.pathname.startsWith('/dashboard')) {
        // dashboard
        urlId = `${urlObj.origin}/dashboard`;
      }
      let newWin = getNewWindow(urlId);
      if(newWin) {
        event.newGuest = newWin;
        newWin.focus();
      }else {
        Object.assign(options, {
          titleBarStyle: "default",
          frame: true,
        });
        event.newGuest = new BrowserWindow({
          ...options,
          width: 1024,
          height: 600,
        });
        event.newGuest._id = urlId;
        event.newGuest.setMenuBarVisibility(false);
      }
      event.newGuest.loadURL(url);
    }
  );
}

function createSplashWindow(clientVersion) {
  return new Promise(resolve => {
    splashWin = new BrowserWindow({
      width: 700,
      height: 500,
      frame: false,
      resizable: false,
      show: false,
      // alwaysOnTop: true,
      webPreferences: {
        // Use pluginOptions.nodeIntegration, leave this alone
        // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
        nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
        webSecurity: false,
        contextIsolation: false,
        preload: path.join(__dirname, "preload.js"),
      },
    });
    splashWin.once("ready-to-show", () => {
      splashWin.show();
      resolve();
    });
    if (process.env.WEBPACK_DEV_SERVER_URL) {
      splashWin.loadURL(process.env.WEBPACK_DEV_SERVER_URL + `splash.html?version=${clientVersion}`);
    } else {
      splashWin.loadURL(`app://./splash.html?version=${clientVersion}`);
    }
  })
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
  try {
    await killSuanpanServer();
  } catch (error) {
    logger.error('kill Suanpan Server error:', error);
  }
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

function getNewWindow(id) {
  let allWins = BrowserWindow.getAllWindows();
  for(let i = 0; i < allWins.length; i++) {
    if(allWins[i]._id == id) {
      return allWins[i];
    }
  }
  return null;
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
     await createSplashWindow(getVersion());
     try {
       reportEnvInfo();
     } catch (e) {
      logger.error(`report install info failed ${e.message}\n${e.stack}`);
     }
     try {
       await launchSuanpanServer();
       await checkServerSuccess(findPort());
       createWindow();
      } catch (e) {
        logger.error(`launch failed ${e.message}\n${e.stack}`);
        splashWin.webContents.send('error-msg', e.message || '');
      }
   });
 }

 ipcMain.on('app-quit', (evt, errorMsg) => {
  process.exit(-1);
 });
