import { ipcMain, BrowserWindow, dialog, app } from 'electron'
import path from 'path';
import electronDl from 'electron-dl'
import fs from 'fs'
import logger from "./log";
import { isDevelopment } from './utils';
import { findProcessByName } from './suanpan/processManager';
import { spawn } from "child_process";
 
 // 下载
 let downloadItems = {};
 // 记录下载的文件名和对应的版本号
 const AppHome = path.join(app.getAppPath(), '../../');
 let updateDLPath = isDevelopment ? path.join(process.cwd(), '/server/updatedl.json') : path.join(AppHome, 'updatedl.json');

 ipcMain.on("client-download-start", function(evt, uuid, url, version){
   let win = BrowserWindow.fromWebContents(evt.sender)
   dialog.showSaveDialog(win, {
     title: '保存',
     defaultPath: path.join(app.getPath('downloads'), path.basename(url))
   }).then(({canceled, filePath }) => {
     if(filePath) {
       let baseFilename = path.basename(filePath);
       let filename = `${baseFilename}.tmp`
       let directory = path.dirname(filePath);
       electronDl.download(win, url, {
         directory,
         filename,
         onStarted(item) {
           downloadItems[uuid] = item;
         },
         onProgress(val) {
           win.webContents.send(uuid, 'onProgress', val);
         },
         onCompleted(val) {
          let dlFilePath = path.join(directory, baseFilename);
          fs.rename(path.join(directory, filename), dlFilePath, function(err) {
            if(err) {
              logger.error('rename file:', err);
              return;
            }
            win.webContents.send(uuid, 'onCompleted', val);
            delete downloadItems[uuid]
            fs.writeFile(updateDLPath, JSON.stringify({path: dlFilePath, version: version}), err => {
              if(err) {
                logger.error(`writeFile ${updateDLPath} file: ${err}`);
                return;
              }
            });
          });
         },
         onCancel() {
           win.webContents.send(uuid, 'onCancel');
           delete downloadItems[uuid]
           if(fs.existsSync(filePath)) {
            fs.unlink(filePath, function(err){
              if(err) {
                logger.error('downloadApi cancel delete file:', err);
              }
            }); 
           }
         }
       })
     }else {
       win.webContents.send(uuid, 'onCancel');
     }
   })
 })
 ipcMain.on("client-download-cancel", function(evt, uuid){
   if(downloadItems[uuid]) {
     downloadItems[uuid].cancel();
   }
 })
 ipcMain.handle("client-download-if", clientDownloadIf);
 function clientDownloadIf() {
  return new Promise(resolve => {
    if(!fs.existsSync(updateDLPath)) {
     resolve({
       result: false
     });
    }else {
      fs.readFile(updateDLPath, (err, data) => {
        if(err) {
         resolve({
           result: false
         });
        }else {
          let dlFile = JSON.parse(data);
          if(!fs.existsSync(dlFile.path)) {
           resolve({
             result: false
           });
          }else {
            resolve({
             result: true,
             version: dlFile.version,
             path: dlFile.path
           });
          }
        }
      })
    }
  })
 }

ipcMain.handle("client-download-install", function() {
  return new Promise(async (resolve) => {
    let serverProcess = await findProcessByName('suanpan-server.exe');
    if(serverProcess.length > 1) {
      resolve({
        result: false,
        errorCode: 'APP_RUNNING'
      })
    }else if(serverProcess.length == 0) {
      resolve({
        result: false,
        errorCode: 'UNKNOWN'
      })
    }else {
      clientDownloadIf().then(async (data) => {
        if(!data.result) {
          resolve({
            result: false,
            errorCode: 'UNKNOWN'
          })
        }else {
          try {
            let installerProcess = spawn('update.exe', {
              detached: true,
              stdio: "ignore",
              cwd: process.resourcesPath,
              env: {
                SP_INSTALLER: data.path
              }
            });
            installerProcess.unref();
          } catch (error) {
            logger.error(`install update installer error: ${error}`)
            resolve({
              result: false,
              errorCode: 'UNKNOWN'
            })
          }
          if(global.mainWin) {
            global.mainWin.destroy();
          }
          app.quit();
        }
      })
    }
  })
});