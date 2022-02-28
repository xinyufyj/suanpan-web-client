import path from 'path';
import { app } from 'electron'
import CryptoJS from 'crypto-js'

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

export function encrypt(text, key) {
  return CryptoJS.AES.encrypt(text, key).toString();
}

export function decrypt (text, key) {
  return CryptoJS.AES.decrypt(text, key).toString(CryptoJS.enc.Utf8);
}
