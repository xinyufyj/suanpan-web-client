const psFind = require('find-process');

async function findProcessByName(name) {
  return psFind('name', name)
}

async function killProcessByName(name) {
  return psFind('name', name).then(psList => {
    psList.forEach(killingProc => {
      process.kill(killingProc.pid, 'SIGKILL');
    });
  })
}

module.exports = {
  findProcessByName,
  killProcessByName
}