const { spawn } = require("child_process");
const { findProcessByName, killProcessByName } = require('./processManager');
// const logger = require('./log');

let { SP_INSTALLER } = process.env;

let tryCount = 0;
let maxTryCount = 10;
let refreshInterval = 200;

function install() {
  if(!SP_INSTALLER) {
    return;
  }
  
  try {
    let installerProcess = spawn(SP_INSTALLER, {
      detached: true,
      stdio: "ignore"
    });
    installerProcess.unref();
  } catch (error) {
    // logger.error(error)
  }
}

async function check() {
  tryCount++;
  let clientProcess = await findProcessByName('suanpan-client.exe');
  if(clientProcess.length < 1) {
    install();
  }else {
    if(tryCount < maxTryCount) {
      setTimeout(() => {
        check();
      }, refreshInterval);
    }else {
      await killProcessByName('suanpan-client.exe');
      setTimeout(() => {
        install();
      }, refreshInterval);
    }
  }
  
}
check()