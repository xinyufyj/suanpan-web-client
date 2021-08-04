import fs from "fs";
import path from "path";
import dotEnv from "dotenv";
import { app } from "electron";
import { isDevelopment } from "./utils";
import { SP_SERVER_NAME } from "./constants";
import { findProcessByName, killProcessByName } from "./processManager";
import { spawn } from "child_process";
import findPort from "find-free-port";
import logger from "../log";

const AppHome = path.join(app.getAppPath(), '../../');
const SP_DESKTOP_HOME = path.join(AppHome, '../');
const dotEnvFile = isDevelopment
  ? path.join(process.cwd(), "/server/.env")
  : path.join(AppHome, ".env");

let currentPort = 7000;

export function getWebOrigin() {
  return `http://127.0.0.1:${currentPort}`;
}

async function findFreePort() {
  let [freep] = await findPort(3000);
  return freep;
}

export async function launchSuanpanServer() {
  try {
    currentPort = await findFreePort();
    logger.info("find free port:", currentPort);
    configServerEnv();
    if (isDaemon()) {
      logger.info("daemon mode enabled");
      let isRunning = await isServerRunning();
      if (isRunning) {
        logger.info("suanpan server was already running");
        return;
      }
    }
    await killSuanpanServer();
    let serverExe = isDevelopment
      ? path.join(process.cwd(), `/server/${SP_SERVER_NAME}`)
      : path.join(AppHome, `../${SP_SERVER_NAME}`);
    logger.info(`launching suanpan server from ${serverExe}`);
    logger.info(`SP_DESKTOP_HOME: ${SP_DESKTOP_HOME}`);
    if (!fs.existsSync(serverExe)) {
      throw new Error(`${serverExe} not exist`);
    }
    let serverProcess = null;
    if(isDevelopment) {
      serverProcess = spawn(serverExe, {
        detached: true,
        stdio: "ignore"
      });
    }else {
      serverProcess = spawn(SP_SERVER_NAME, {
        detached: true,
        stdio: "ignore",
        cwd: SP_DESKTOP_HOME,
        env: {
          "SP_PORT": `${currentPort}`,
          "SP_DESKTOP_HOME": SP_DESKTOP_HOME
        },
      });
    }
    serverProcess.unref();
  } catch (e) {
    logger.error(`launch suanpan server failed ${e.message}\n${e.stack}`);
    process.exit(-1);
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

export function writeDotEnv({ SP_CONFIG, USER_ID, NODE_ENV }) {
  let content = `
SP_CONFIG=${SP_CONFIG}
USER_ID=${USER_ID}
NODE_ENV=${NODE_ENV}
`;
  fs.writeFileSync(dotEnvFile, content);
}

function configServerEnv() {
  if (fs.existsSync(dotEnvFile)) {
    dotEnv.config({ path: dotEnvFile });
  } else {
    if (!process.env["SP_CONFIG"]) {
      let defaultCfg = isDevelopment
        ? "C:\\xuelangyun\\project\\suanpan-web-client\\server\\default.js"
        : "C:\\snapshot\\suanpan\\config\\default.js";
      let windowsCfg = isDevelopment
        ? "C:\\xuelangyun\\project\\suanpan-web-client\\server\\windows.js"
        : "C:\\snapshot\\suanpan\\config\\windows.js";
      let localCfg = isDevelopment
        ? "C:\\xuelangyun\\project\\suanpan-web-client\\server\\local.js"
        : path.join(SP_DESKTOP_HOME, "config/local.js");
      process.env["SP_CONFIG"] = `${defaultCfg},${windowsCfg},${localCfg}`;
    }
    if (!process.env["USER_ID"]) {
      process.env["USER_ID"] = "shanglu";
    }
    if (!process.env["NODE_ENV"]) {
      process.env["NODE_ENV"] = "Windows";
    }
    writeDotEnv(process.env);
  }
}
