'use strict'
import { app, protocol, BrowserWindow, ipcMain, Tray, Menu, MenuItem, dialog, shell } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import path from 'path'
import logger from './log'
import { isDevelopment, trayIconPath, isWindows, interval, checkRedis, checkMinio } from './utils'
import { getWebOrigin, launchSuanpanServer, checkServerSuccess, cleanUpBeforeQuit, reportEnvInfo, getVersion, getOsInfo } from './suanpan'
import './downloadApi'
import { closeHandler } from './dialog'

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

let win = null, splashWin = null, tray = null;

async function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: 1400,
    minWidth: 1024,
    height: 900,
    minHeight: 600,
    titleBarStyle: "hidden",
    title: '雪浪云 算盘',
    show: true,
    webPreferences: {
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
      contextIsolation: false,
      webSecurity: false,
      preload: path.join(__dirname, "preload.js"),
    }
  })
  global.mainWin = win;
  win.setMenuBarVisibility(false);
  if(splashWin) {
    splashWin.destroy();
    splashWin = null;
  }
  if (process.env.WEBPACK_DEV_SERVER_URL && !process.env.IS_TEST) {
    win.webContents.openDevTools();
  }
  win.loadURL(getWebOrigin());
  win.on('close', (event) => {
    event.preventDefault();
    closeHandler(win);
  })

  win.webContents.on(
    "new-window",
    async (event, url, frameName, disposition, options, additionalFeatures) => {
      event.preventDefault();
      // use native browser open
      if(url.indexOf('xuelangyun.yuque.com/docs') > -1) {
        shell.openExternal(url)
        return
      }
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

function openMainWindow() {
  if(splashWin) {
    return;
  }
  if (win == null) {
    createWindow();
  } else {
    if (win.isMinimized())  {
      win.restore();
    }
    if(!win.isVisible()) {
      win.show();
    }
    win.focus();
  }
}

function createTray() {
  // https://www.electronjs.org/docs/api/native-image#high-resolution-image
  tray = new Tray(trayIconPath);
  tray.on("click", () => {
    openMainWindow();
  });
  const contextMenu = Menu.buildFromTemplate([
    new MenuItem({
      label: `打开${Array(8).fill(' ').join('')}`,
      click() {
        openMainWindow();
      },
    }),
    new MenuItem({
      label: `退出${Array(8).fill(' ').join('')}`,
      click() {
        if(win) {
          win.destroy();
        }
        if(tray) {
          tray.destroy();
        }
        app.quit();
      },
    }),
  ]);
  tray.setToolTip("雪浪云 算盘");
  tray.setContextMenu(contextMenu);
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
  await cleanUpBeforeQuit();
  process.exit(0);
});

process.on('uncaughtException', function (error) {
  logger.error('electron uncaughtException:', error.message, error.stack)
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
     openMainWindow();
   });
   app.on("ready", async () => {
      createTray();
      if(!isDevelopment) {
        createProtocol('app');
      }
      await createSplashWindow(getVersion());
      reportEnvInfo();
      interval(reportEnvInfo, 2*3600*1000);
      try {
        await Promise.all([checkRedis(), checkMinio()])
        await launchSuanpanServer();
        await checkServerSuccess();
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

 ipcMain.on('client-dialog-confirm', function(evt, str) {
  let result = false;
  let opts = {
    type: 'warning',
    buttons: ['确认', '取消'],
    defaultId: 0,
    cancelId: 1,
    detail: '',
    message: str
  };
  let flag = dialog.showMessageBoxSync(win, opts);
  if(flag == 0) {
    result = true;
  }else {
    result = false;
  }
  evt.returnValue = result;
})

ipcMain.on('client-dialog-alert', function(evt, str) {
  let opts = {
    type: 'warning',
    buttons: ['确认'],
    defaultId: 0,
    cancelId: 0,
    detail: str,
    message: ''
  };
  evt.returnValue = dialog.showMessageBoxSync(win, opts);
})

ipcMain.handle('client-uuid', function(evt) {
  return new Promise(async (resolve) => {
    let uuid = 'unknown';
    try {
      uuid = (await getOsInfo()).uuid
    } catch (error) {
    }
    resolve(uuid);
  }) 
})
