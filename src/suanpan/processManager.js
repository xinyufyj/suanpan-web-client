const psList = require('ps-list');

async function findProcess(filter) {
  let result = [];
  try {
    let processes = await psList();
    for (let i = 0, length = processes.length; i < length; i++) {
      let process = processes[i];
      if (filter(process)) {
        result.push(process);
      }
    }
  } catch (e) {
    console.error(`failed to query process ${e}`);
  }
  return result;
}

export async function findProcessByPid(pid) {
  return await findProcess((process) => { return process.pid == pid; });
}

export async function findProcessByName(name) {
  return await findProcess((process) => { return process.name == name; });
}

export async function killProcessByName(name) {
  let processes = await findProcessByName(name);
  if (processes.length > 0) {
    console.log(`killing processes ${name}${JSON.stringify(processes)}`);
  }
  processes.forEach(killingProc => {
    console.log(`killing process ${killingProc.pid}`);
    process.kill(killingProc.pid, 'SIGKILL');
  });
}