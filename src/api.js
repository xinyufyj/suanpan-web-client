import { ipcMain, shell, app } from 'electron'
import path from 'path'
import fs from 'fs'
import logger from "./log";
import { encrypt, decrypt } from './utils'

ipcMain.handle('client-sign-up-link', function(evt, link) {
  return new Promise((resolve) => {
    shell.openExternal(link)
    resolve({
      result: true
    });
  }) 
})

const userInfoPath = path.join(app.getPath('userData'), 'ur')
const encryptKey = 'suanpanclient9'

ipcMain.handle('client-save-user-info', function(evt, data) {
  return new Promise((resolve) => {
    fs.writeFile(userInfoPath, encrypt(JSON.stringify(data), encryptKey), (err) => {
      if(err) {
        logger.error(`${userInfoPath} write error:`, err);
        resolve({
          result: false
        })
      }else {
        resolve({
          result: true
        });
      }
    })

  }) 
})

ipcMain.handle('client-get-user-info', function(evt) {
  return new Promise((resolve) => {
    if(!fs.existsSync(userInfoPath)) {
      resolve({
        result: false
      })
      return
    }
    fs.readFile(userInfoPath, 'utf-8', (err, data) => {
      if(err) {
        logger.error(`${userInfoPath} read error:`, err);
        resolve({
          result: false
        })
      }else {
        let userInfo = null
        try {
          userInfo = JSON.parse(decrypt(data, encryptKey))
        } catch (err) {
          logger.error(`${userInfoPath} json parse or decrypt error:`, err);
        }
        if(userInfo) {
          resolve({
            result: true,
            data: userInfo
          })
        }else {
          resolve({
            result: false
          })
        }
      }
    })
  }) 
})

