const log4js = require('log4js');

const logFileDir = './logDir'

log4js.configure({
  appenders: {
    out: { type: 'stdout' },
    app: { type: 'file', filename: './logDir/log' }
  },
  categories: {
    default: { appenders: [ 'out', 'app' ], level: 'debug' }
  }
});

module.exports = log4js.getLogger();