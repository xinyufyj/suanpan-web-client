import { ipcMain, BrowserWindow, dialog } from 'electron'
import path from 'path';
import electronDl from 'electron-dl'
 
 // 下载
 let downloadItems = {};
 ipcMain.on("client-download-start", function(evt, uuid, url){
   let win = BrowserWindow.fromWebContents(evt.sender)
   dialog.showSaveDialog(win, {
     title: '保存',
     defaultPath: path.join(app.getPath('downloads'), path.basename(url))
   }).then(({canceled, filePath }) => {
     if(filePath) {
       let filename = path.basename(filePath);
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
           win.webContents.send(uuid, 'onCompleted', val);
           delete downloadItems[uuid]
         },
         onCancel() {
           win.webContents.send(uuid, 'onCancel');
           delete downloadItems[uuid]
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