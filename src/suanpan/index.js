import fs from "fs";
import path from "path";
import { app } from "electron";
import { isDevelopment } from "./utils";
import { SP_SERVER_NAME } from "./constants";
import { findProcessByName, killProcessByName, findProcessByPid, killProcessByPid } from "./processManager";
import { spawn } from "child_process";
import http from "http";
import ini from "ini";
import logger from "../log";

const AppHome = path.join(app.getAppPath(), '../../');
const SP_DESKTOP_HOME = path.join(AppHome, '../');
const ServerConfigPath = isDevelopment ? path.join(process.cwd(), '/server/server.ini') : path.join(SP_DESKTOP_HOME, 'server.ini');
const CurrentPidPath = isDevelopment ? path.join(process.cwd(), '/server/pid.json') : path.join(AppHome, 'pid.json');

let currentPort = 7000;
let serverPid = null;
let DAEMONIZE = false;

export function getWebOrigin() {
  return `http://127.0.0.1:${currentPort}`;
}

export function findPort() {
  if(fs.existsSync(ServerConfigPath)) {
    let iniConfig = ini.parse(fs.readFileSync(ServerConfigPath, 'utf-8'));
    if(iniConfig && iniConfig.SP_PORT) {
      currentPort = iniConfig.SP_PORT;
    }
  }
  logger.info("current server port:", currentPort);
  return currentPort;
}

export async function launchSuanpanServer() {
  if(!fs.existsSync(CurrentPidPath)) {
    launchSever(); 
  }else {
    serverPid = fs.readFileSync(CurrentPidPath);
    try {
      serverPid = JSON.parse(serverPid).pid;
      let serverProcess = [];
      if(serverPid != null) {
        serverProcess = await findProcessByPid(serverPid);
      }
      if((serverProcess.length === 0) || (serverProcess[0].name != SP_SERVER_NAME)) {
        logger.info("launch Suanpan Sever as not found server process with pid: ", serverPid);
        launchSever();
      }else {
        logger.info("found Suanpan Sever process with pid:", serverPid);
      }
    }catch (e) {
      logger.error('pid file parse error', CurrentPidPath);
      launchSever();
    }
  }
}

function launchSever() {
  try {    
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
        detached: true,
        stdio: "ignore",
        env: env,
      });
    }else {
      serverProcess = spawn(SP_SERVER_NAME, {
        detached: true,
        stdio: "ignore",
        cwd: SP_DESKTOP_HOME,
        env: env,
      });
    }
    serverProcess.unref();
    serverPid = serverProcess.pid;
    fs.writeFileSync(CurrentPidPath, JSON.stringify({pid: serverPid}));
    logger.info(`server spawn`);
  } catch (e) {
    logger.error(`launch suanpan server failed ${e.message}\n${e.stack}`);
    process.exit(-1);
  }
}

function generateEnv() {
  let defaultCfg = isDevelopment
      ? "C:\\snapshot\\suanpan\\config\\default.js"
      : "C:\\snapshot\\suanpan\\config\\default.js";
    let windowsCfg = isDevelopment
      ? "C:\\snapshot\\suanpan\\config\\windows.js"
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

export async function killSuanpanServer() {
  if(fs.existsSync(ServerConfigPath)) {
    let iniConfig = ini.parse(fs.readFileSync(ServerConfigPath, 'utf-8'));
    if(iniConfig && (iniConfig.DAEMONIZE == true || iniConfig.DAEMONIZE == 'true')) {
      DAEMONIZE = true;
    }
  }
  if(!DAEMONIZE && serverPid) {
    await killProcessByPid(serverPid);
  }
}

export function isDaemon() {
  return process.env["SERVER_DAEMON"] == "true";
}

export async function isServerRunning() {
  let serverProcesses = await findProcessByName(SP_SERVER_NAME);
  return serverProcesses.length > 0;
}

export async function checkServerSuccess(port) {
  return new Promise((resolve, reject) => {
    const queryInterval = 1000;
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
          }, queryInterval);
        }
      })
      req.on('timeout', err => {
        tryCount--;
        if(tryCount < 0) {
          reject('query server timeout', new Error('timeout'));
        }else {
          setTimeout(() => {
            qs();
          }, queryInterval);
        }
      })
      req.end();
    }
    qs();
  });
}

