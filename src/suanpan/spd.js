import { spawn } from "child_process";
import path from "path";
import { SP_DESKTOP_HOME } from "./utils";

const SPD_NAME = 'spd.exe';
// const SPDA_NAME = 'spda.exe';
const SPD_DIR = path.join(SP_DESKTOP_HOME, 'tools/');


export function spdCheck() {
  return new Promise((resolve, reject) => {
    let msg = ''

    let spd_process = spawn(SPD_NAME, ['all'], {
      cwd: SPD_DIR,
    });
    
    spd_process.stderr.on('data', (data) => {
      msg += data;
    });
    
    spd_process.on('exit', function(code){
      console.log(`exit with code ${code}`);
      if(code === 0) {
        resolve()
      }else if(code === 1) {
        reject({ code, message: msg })
      }else if(code === 2) {
        reject({ code, message: msg })
      }
    });
  })
}

export function spdFix() {
  return new Promise((resolve, reject) => {
    let msg = ''

    let spd_process = spawn(SPD_NAME, ['all', '-f'], {
      cwd: SPD_DIR,
    });
  
    spd_process.stdout.on('data', (data) => {
      msg += data;
    });
    
    spd_process.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });
    
    spd_process.on('exit', function(code){
      console.log(`exit with code ${code}`);
      if(code === 0) {
        resolve()
      }else {
        reject(new Error('修复失败'))
      }
    });
  })
}