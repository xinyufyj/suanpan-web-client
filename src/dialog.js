import { app, BrowserWindow, ipcMain } from 'electron'
import { isDevelopment, AppHome } from './utils'
import fs from 'fs'
import path from 'path'
import logger from './log'
import { currentVersion } from './suanpan'

const UserConfigPath = isDevelopment ? path.join(process.cwd(), '/server/userconfig.json') : path.join(AppHome, 'userconfig.json');

let dialogWin = null;
let userConfig = {};

fs.access(UserConfigPath, (err) => {
  if (err) {
    return;
  }
  fs.readFile(UserConfigPath, 'utf-8', (err, data) => {
    if(err) {
      logger.error(`${UserConfigPath} read error:`, err);
      userConfig = {};
    }else {
      try {
        userConfig = JSON.parse(data)
      } catch (err) {
        logger.error(`${UserConfigPath} json parse error:`, err);
      }
    }
  })
});

export function closeHandler(win) {
  if((userConfig.version && userConfig.version == currentVersion) && (userConfig.nextTimeNotShow === true || userConfig.nextTimeNotShow === 'true')) {
    handler();
  }else {
    let winBound = win.getBounds();
    let DialogWidth = 350, DialogHeight = 200;
    let x = (winBound.width - DialogWidth) * 0.5 + winBound.x;
    let y = 50 +  winBound.y;
    dialogWin = new BrowserWindow({
      title: '提示',
      width: DialogWidth,
      height: DialogHeight,
      x: x,
      y: y,
      frame: true,
      resizable: false,
      show: true,
      minimizable: false,
      maximizable: false,
      modal: true,
      parent: win,
      webPreferences: {
        nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
        webSecurity: false,
        contextIsolation: false,
        preload: path.join(__dirname, "preload.js"),
      },
    });
    dialogWin.setMenuBarVisibility(false);
    if (process.env.WEBPACK_DEV_SERVER_URL) {
      dialogWin.loadURL(process.env.WEBPACK_DEV_SERVER_URL + `dialog.html`);
    } else {
      dialogWin.loadURL(`app://./dialog.html`);
    }
    dialogWin.on('close', (event) => {
      event.preventDefault();
      if(dialogWin) {
        dialogWin.destroy();
        dialogWin = null;
      }
    })
  }
}

ipcMain.on('dialog-confirm', (evt, opts={}) => {
  Object.assign(userConfig, {version: currentVersion} ,opts);
  fs.writeFile(UserConfigPath, JSON.stringify(userConfig), (err) => {
    if(err) {
      logger.error(`${UserConfigPath} write error:`, err);
    }
    if(dialogWin) {
      dialogWin.destroy();
      dialogWin = null;
    }
    handler();
  })
})

function handler() {
  if(userConfig.action == 'quit') {
    quitApp()
  }else if(userConfig.action == 'tray') {
    if(global.mainWin) {
      global.mainWin.hide()
    }
  }else {
    quitApp()
  }
}

function quitApp() {
  // if(global.mainWin) {
  //   global.mainWin.destroy();
  // }
  // app.quit();
  BrowserWindow.getAllWindows().forEach(win => {
    win.destroy();
  })
}
