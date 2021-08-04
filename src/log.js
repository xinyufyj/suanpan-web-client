import { app } from 'electron'
import path from 'path'
import log4js from 'log4js'

const logFileDir = process.env.NODE_ENV !== 'production' ? './logDir' : path.join(app.getAppPath(), '../../logDir')

log4js.configure({
  appenders: {
    out: { type: 'stdout' },
    app: { type: 'file', filename: path.join(logFileDir, './log') }
  },
  categories: {
    default: { appenders: [ 'out', 'app' ], level: 'debug' }
  }
});

export default log4js.getLogger();