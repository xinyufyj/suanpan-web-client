import { ipcMain, BrowserWindow, dialog, app } from 'electron'
import path from 'path';
import electronDl from 'electron-dl'
import fs from 'fs'
import logger from "./log";
 
 // 下载
 let downloadItems = {};
 ipcMain.on("client-download-start", function(evt, uuid, url){
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
          fs.rename(path.join(directory, filename), path.join(directory, baseFilename), function(err) {
            if(err) {
              logger.error('rename file:', err);
              return;
            }
            win.webContents.send(uuid, 'onCompleted', val);
            delete downloadItems[uuid]
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