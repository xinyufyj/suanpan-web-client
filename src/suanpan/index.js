import fs from "fs";
import path from "path";
import { app } from "electron";
import { isDevelopment } from "./utils";
import { SP_SERVER_NAME } from "./constants";
import { findProcessByName, killProcessByName } from "./processManager";
import { spawn } from "child_process";
import findPort from "find-free-port";
import http from "http";
import logger from "../log";

const AppHome = path.join(app.getAppPath(), '../../');
const SP_DESKTOP_HOME = path.join(AppHome, '../');

let currentPort = 7000;

export function getWebOrigin() {
  return `http://127.0.0.1:${currentPort}`;
}

export async function findFreePort() {
  let [freep] = await findPort(7000);
  logger.info("find free port:", freep);
  currentPort = freep;
  return freep;
}

export async function launchSuanpanServer() {
  try {
    if (isDaemon()) {
      logger.info("daemon mode enabled");
      let isRunning = await isServerRunning();
      if (isRunning) {
        logger.info("suanpan server was already running");
        return;
      }
    }
    // await killSuanpanServer();
    let serverExe = isDevelopment
      ? path.join(process.cwd(), `/server/${SP_SERVER_NAME}`)
      : path.join(AppHome, `../${SP_SERVER_NAME}`);
    logger.info(`launching suanpan server from ${serverExe}`);
    logger.info(`SP_DESKTOP_HOME: ${SP_DESKTOP_HOME}`);
    if (!fs.existsSync(serverExe)) {
      throw new Error(`${serverExe} not exist`);
    }
    let serverProcess = null;
    let env = generateEnv();
    logger.info(`suanpan server env:`, JSON.stringify(env));
    if(isDevelopment) {
      serverProcess = spawn(serverExe, {
        // detached: true,
        stdio: "ignore",
        env: env,
      });
    }else {
      serverProcess = spawn(SP_SERVER_NAME, {
        // detached: true,
        stdio: "ignore",
        cwd: SP_DESKTOP_HOME,
        env: env,
      });
    }
    // serverProcess && serverProcess.unref();
    logger.info(`server spawn`);
  } catch (e) {
    logger.error(`launch suanpan server failed ${e.message}\n${e.stack}`);
    process.exit(-1);
  }
}

function generateEnv() {
  let defaultCfg = isDevelopment
      ? "C:\\xuelangyun\\project\\suanpan-web-client\\server\\default.js"
      : "C:\\snapshot\\suanpan\\config\\default.js";
    let windowsCfg = isDevelopment
      ? "C:\\xuelangyun\\project\\suanpan-web-client\\server\\windows.js"
      : "C:\\snapshot\\suanpan\\config\\windows.js";
    let localCfg = isDevelopment
      ? "C:\\xuelangyun\\project\\suanpan-web-client\\server\\local.js"
      : path.join(SP_DESKTOP_HOME, "config/local.js");
  return {
    "SP_PORT": `${currentPort}`,
    "SP_DESKTOP_HOME": SP_DESKTOP_HOME,
    "USER_ID": "shanglu",
    "NODE_ENV": "Windows",
    "SP_CONFIG": `${defaultCfg},${windowsCfg},${localCfg}`
  }
}

export function isDaemon() {
  return process.env["SERVER_DAEMON"] == "true";
}

export async function killSuanpanServer() {
  await killProcessByName(SP_SERVER_NAME);
}

export async function isServerRunning() {
  let serverProcesses = await findProcessByName(SP_SERVER_NAME);
  return serverProcesses.length > 0;
}

export async function checkServerSuccess(port) {
  return new Promise((resolve, reject) => {
    let tryCount = 5;
    let qs = () => {
      const req = http.request(getWebOrigin(), {
        method: 'GET',
        timeout: 1000
      }, res => {
        res.on("data", ()=>{})
        res.on("end", () => {
          resolve();
        });
      });
      req.on('error', err => {
        tryCount--;
        if(tryCount < 0) {
          reject('query server error', new Error('query error'));
        }else {
          setTimeout(() => {
            qs();
          }, 1000);
        }
      })
      req.on('timeout', err => {
        tryCount--;
        if(tryCount < 0) {
          reject('query server timeout', new Error('timeout'));
        }else {
          setTimeout(() => {
            qs();
          }, 1000);
        }
      })
      req.end();
    }
    qs();
  });
}

