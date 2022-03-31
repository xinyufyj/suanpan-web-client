import { BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import logger from './log'
import { currentPort } from './suanpan'

let dialogWin = null;

export function closeHandler(win) {
  let uuid = `${Date.now()}`
  win.webContents.send('fetch-userConfig', uuid);
  ipcMain.on(uuid, async (event, res) => {
    ipcMain.removeAllListeners(uuid);
    if(res.data.exitProgramDirectly === true || res.data.exitProgramDirectly === false) {
      handler(res.data.exitProgramDirectly)
      return
    }
    let winBound = win.getBounds();
    let DialogWidth = 408, DialogHeight = 320;
    let x = (winBound.width - DialogWidth) * 0.5 + winBound.x;
    let y = 50 +  winBound.y;
    dialogWin = new BrowserWindow({
      title: '退出设置',
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
      // dialogWin.webContents.openDevTools();
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
  })
}

ipcMain.on('dialog-confirm', (evt, opts={}) => {
  let uuid = `${Date.now()}`
  global.mainWin.webContents.send('save-userConfig', uuid, opts);
  ipcMain.on(uuid, async (event, res) => {
    ipcMain.removeAllListeners(uuid);
    if(res.err) {
      logger.error('save userconfig error:', res.message)
    }else {
      handler(opts.exitProgramDirectly)
    }
  })
})

function handler(exitProgramDirectly) {
  if(exitProgramDirectly === true) {
    if(dialogWin) {
      dialogWin.destroy();
      dialogWin = null;
    }
    quitApp(global.mainWin)
  }else if(exitProgramDirectly === false) {
    if(dialogWin) {
      dialogWin.destroy();
      dialogWin = null;
    }
    if(global.mainWin) {
      global.mainWin.hide()
    }
  }else {}
}

let closeWin = null
export function quitApp(win) {
  let uuid = `${Date.now()}`
  win.webContents.send('fetch-userConfig', uuid);
  ipcMain.on(uuid, async (event, res) => {
    ipcMain.removeAllListeners(uuid);
    let exitStopAll = res.data.exitStopAll === true
    let winBound = win.getBounds();
    let CloseWidth = 380, CloseHeight = 88;
    let x = (winBound.width - CloseWidth) * 0.5 + winBound.x;
    let y = (winBound.height - CloseHeight) * 0.5 + winBound.y - 80;
    closeWin = new BrowserWindow({
      width: CloseWidth,
      height: CloseHeight,
      x: x,
      y: y,
      frame: false,
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
    closeWin.setMenuBarVisibility(false);
    let searchParam = `port=${currentPort}&exitStopAll=${exitStopAll}`
    if (process.env.WEBPACK_DEV_SERVER_URL) {
      closeWin.loadURL(process.env.WEBPACK_DEV_SERVER_URL + `close.html?${searchParam}`);
      // closeWin.webContents.openDevTools();
    } else {
      closeWin.loadURL(`app://./close.html?${searchParam}`);
    }
    win.hide()
  });
}
