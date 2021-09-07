import fs from "fs";
import path from "path";
import { app } from "electron";
import { isDevelopment } from "./utils";
import { SP_SERVER_NAME } from "./constants";
import { findProcessByName, killProcessByName, findProcessByPid, killProcessByPid } from "./processManager";
import { spawn } from "child_process";
import http from "http";
import ini from "ini";
import si from "systeminformation";
import detectPort from 'detect-port'; 
import logger from "../log";

const AppHome = path.join(app.getAppPath(), '../../');
const SP_DESKTOP_HOME = isDevelopment ? 'C:\\xuelangyun\\suanpan-desktop' : path.join(AppHome, '../');
const ServerConfigPath = isDevelopment ? path.join(process.cwd(), '/server/server.ini') : path.join(SP_DESKTOP_HOME, 'server.ini');
const CurrentPidPath = isDevelopment ? path.join(process.cwd(), '/server/pid.json') : path.join(AppHome, 'pid.json');

let currentPort = 7000;
let currentVersion = '0.0.1';
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
    await launchSever(); 
  }else {
    serverPid = JSON.parse(fs.readFileSync(CurrentPidPath)).pid;
    let serverProcess = [];
    if(serverPid != null) {
      serverProcess = await findProcessByPid(serverPid);
    }
    if((serverProcess.length === 0) || (serverProcess[0].name != SP_SERVER_NAME)) {
      logger.info("launch Suanpan Sever as not found server process with pid: ", serverPid);
      await launchSever();
    }else {
      logger.info("found Suanpan Sever process with pid:", serverPid);
    }
  }
}

async function launchSever() {
  await checkPortIsOccupied(currentPort)
  let serverExe = path.join(SP_DESKTOP_HOME, SP_SERVER_NAME);
  logger.info(`launching suanpan server from ${serverExe}`);
  logger.info(`SP_DESKTOP_HOME: ${SP_DESKTOP_HOME}`);
  if (!fs.existsSync(serverExe)) {
    throw new Error(`${serverExe} not exist`);
  }
  let env = generateEnv();
  logger.info(`suanpan server env:`, JSON.stringify(env));
  let serverProcess = spawn(SP_SERVER_NAME, {
    detached: true,
    stdio: "ignore",
    cwd: SP_DESKTOP_HOME,
    env: env,
  });
  serverProcess.unref();
  serverPid = serverProcess.pid;
  fs.writeFileSync(CurrentPidPath, JSON.stringify({pid: serverPid}));
  logger.info(`server spawn`);
}

function generateEnv() {
  let defaultCfg = "C:\\snapshot\\suanpan\\config\\default.js";
    let windowsCfg = "C:\\snapshot\\suanpan\\config\\windows.js";
    let localCfg = path.join(SP_DESKTOP_HOME, "config/local.js");
  const fixedEnv = {
    "SP_PORT": `${currentPort}`,
    "SP_DESKTOP_HOME": SP_DESKTOP_HOME,
    "SP_CONFIG": `${defaultCfg},${windowsCfg},${localCfg}`
  };
  const adhocEnvs = getAdhocEnvironmentVariables();
  return { ...fixedEnv, ...adhocEnvs };
}

function getAdhocEnvironmentVariables() {
  const envs = {};
  if(fs.existsSync(ServerConfigPath)) {
    try{
      let iniConfig = ini.parse(fs.readFileSync(ServerConfigPath, 'utf-8'));
      if(iniConfig.env) {
        for(const [key, value] of Object.entries(iniConfig.env)) {
          envs[key] = `${value}`;
        }
      }
    } catch(e) {
      logger.error(`parse adhoc environment variables error ${e}`);
    }
  }
  return envs;
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

function checkPortIsOccupied(port) {
  return new Promise((resolve, reject) => {
    detectPort(port, (err, _port) => {
      if (err) {
        reject(err);
      }else {
        if (port == _port) {
          resolve(port)
        } else {
          reject(new Error(`端口: ${port} 被占用`));
        }
      }
    });
  })
}

export async function checkServerSuccess(port) {
  return new Promise((resolve, reject) => {
    const queryInterval = 200;
    let tryCount = 50;
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

// Electron客户端启动生成uuid，后台上报装机与安装环境信息
export function reportEnvInfo() {
  return new Promise(async (resolve, reject) => {
    const params = {};
    const systemInfo = await si.system();
    const osInfo = await si.osInfo();
    const memInfo = await si.mem();
    params.uuid = systemInfo.uuid;
    params.version = currentVersion;
    params.os = osInfo.platform;
    Object.assign(params, {
      manufacturer: systemInfo.manufacturer,
      model: systemInfo.manufacturer,
      distro: osInfo.distro,
      arch: osInfo.arch,
      totalMem: memInfo.total,
      freeMem: memInfo.free
    });
    const postData = JSON.stringify(params);
    const req = http.request(`http://spnext.xuelangyun.com/desktop/install/stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      res.on("data", ()=>{})
      res.on("end", () => {
        resolve();
      });
    });
    req.on('error', err => {
      reject('stats query server error', new Error('query error'));
      logger.error('report env info error', err);
    });
    req.on('timeout', err => {
      reject('stats query server timeout', new Error('timeout'));
    });
    req.write(postData);
    req.end();
  });
}

