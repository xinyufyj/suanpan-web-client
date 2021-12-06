import path from 'path';
import { app } from 'electron'
import findProcess from 'find-process'

export const isDevelopment = process.env.NODE_ENV !== 'production';
export const isWindows = process.platform === 'win32';
export const assetsPath = path.resolve(
  !isDevelopment
    ? path.join(process.resourcesPath, "assets")
    : path.join(".", "src", "assets")
);
export const trayIconPath = path.join(assetsPath, "logo.png")

export const AppHome = path.join(app.getAppPath(), '../../');

/**
 * 用 setTimeout 模拟 setInterval
 * @param {*} fn
 * @param {*} wait
 */
 export function interval(fn, wait) {
  let timeout;
  let wrapFn = function() {
    fn();
    if (timeout != null) {
      timeout = setTimeout(() => {
        wrapFn();
      }, wait);
    }
  };
  wrapFn.clear = function() {
    clearTimeout(timeout);
    timeout = null;
  };
  timeout = setTimeout(() => {
    wrapFn();
  }, wait);
  return wrapFn;
}

// check redis
export function checkRedis(port=6379) {
  return new Promise((resolve, reject) => {
    let errMsg = '消息队列服务没有正常运行';
    findProcess('port', port)
      .then(list => {
        if((list.length > 0) && (list[0].name === 'redis-server.exe')) {
          resolve()
        }else {
          reject(new Error(errMsg))
        }
      }).catch(err => {
        reject(new Error(errMsg))
      })
  })
}

// check minio
export function checkMinio(port=19000) {
  return new Promise((resolve, reject) => {
    let errMsg = '对象存储服务没有正常运行';
    findProcess('port', port)
      .then(list => {
        if((list.length > 0) && (list[0].name === 'minio.exe')) {
          resolve()
        }else {
          reject(new Error(errMsg))
        }
      }).catch(err => {
        reject(new Error(errMsg))
      })
  })
}