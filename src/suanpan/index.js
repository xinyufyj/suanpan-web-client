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
import requireFromString from 'require-from-string';
import logger from "../log";
import findProcess from 'find-process'

const AppHome = path.join(app.getAppPath(), '../../');
const SP_DESKTOP_HOME = isDevelopment ? 'C:\\xuelangyun\\suanpan-desktop' : path.join(AppHome, '../');
const ServerConfigPath = isDevelopment ? path.join(process.cwd(), '/server/server.ini') : path.join(SP_DESKTOP_HOME, 'server.ini');
let ServerIniConfig = null
if(fs.existsSync(ServerConfigPath)) {
  ServerIniConfig = ini.parse(fs.readFileSync(ServerConfigPath, 'utf-8'));
}
const CurrentPidPath = isDevelopment ? path.join(process.cwd(), '/server/pid.json') : path.join(AppHome, 'pid.json');
const LocalFilePath = path.join(SP_DESKTOP_HOME, '/config/local.js');

export let currentPort = 7000;
let redisPort = 16379;
let minioPort = 19000;
export let currentVersion = 'unknown';
let serverPid = null;
let DAEMONIZE = false;

export function getWebOrigin() {
  return `http://127.0.0.1:${currentPort}`;
}

function findPort() {
  if(ServerIniConfig && ServerIniConfig.SP_PORT) {
    currentPort = ServerIniConfig.SP_PORT;
  }
  logger.info("current server port:", currentPort);
  return currentPort;
}

export async function launchSuanpanServer() {
  findPort()
  if(ServerIniConfig && (ServerIniConfig.NotLaunchBackend === true || ServerIniConfig.NotLaunchBackend === 'true')) {
    return
  }
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
  return { ...process.env, ...fixedEnv, ...adhocEnvs };
}

function getAdhocEnvironmentVariables() {
  const envs = {};
  if(ServerIniConfig && ServerIniConfig.env) {
    for(const [key, value] of Object.entries(ServerIniConfig.env)) {
      envs[key] = `${value}`;
    }
  }
  return envs;
}

export async function killSuanpanServer(forceKillServer=false) {
  if(!forceKillServer) {
    if(ServerIniConfig && (ServerIniConfig.DAEMONIZE === true || ServerIniConfig.DAEMONIZE === 'true')) {
      DAEMONIZE = true;
    }
  }
  if((!DAEMONIZE || forceKillServer) && serverPid) {
    await killProcessByPid(serverPid);
  }
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

export async function cleanUpBeforeQuit(forceKillServer=false) {
  try {
    await killSuanpanServer(forceKillServer);
  } catch (error) {
    logger.error('kill Suanpan Server error:', error);
  }
}

export function getVersion() {
  if(fs.existsSync(LocalFilePath)) {
    try {
      let obj = requireFromString(fs.readFileSync(LocalFilePath, 'utf-8'));
      if(obj.clientVersion) {
        currentVersion = obj.clientVersion;
      }
      if(obj.oss && obj.oss.port) {
        minioPort = obj.oss.port
      }
      if(obj.redis && obj.redis.port) {
        redisPort = obj.redis.port
      }
    } catch (error) {
      logger.error('cannot get local.js', error);
    }
  }
  return currentVersion;
}

export async function checkServerSuccess() {
  return new Promise((resolve, reject) => {
    const queryInterval = 100;
    let tryCount = 100;
    let qs = () => {
      const req = http.request(getWebOrigin(), {
        method: 'HEAD',
        timeout: 250
      }, res => {
        res.on("data", ()=>{})
        res.on("end", () => {
          resolve();
        });
      });
      req.on('error', err => {
        tryCount--;
        if(tryCount < 0) {
          reject(new Error('query server error'));
        }else {
          setTimeout(() => {
            qs();
          }, queryInterval);
        }
      })
      req.on('timeout', err => {
        tryCount--;
        if(tryCount < 0) {
          reject(new Error('query server timeout'));
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

export async function getOsInfo() {
  return await si.system();
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
      // distro: osInfo.distro,
      platform: osInfo.platform,
      arch: osInfo.arch,
      totalMem: memInfo.total,
      freeMem: memInfo.free
    });
    const postData = JSON.stringify(params);
    const req = http.request(`https://spnext.xuelangyun.com/desktop/install/stats`, {
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
  }).catch(e => {
    logger.error(`report install info failed ${e.message}`);
  });
}

// check redis
export function checkRedis() {
  return new Promise((resolve, reject) => {
    let errMsg = '消息队列服务没有正常运行';
    findProcess('port', redisPort)
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
export function checkMinio() {
  return new Promise((resolve, reject) => {
    let errMsg = '对象存储服务没有正常运行';
    findProcess('port', minioPort)
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
