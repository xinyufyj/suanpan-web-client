import path from "path";
import { app } from "electron";


export const isDevelopment = process.env.NODE_ENV !== 'production';
export const isWindows = process.platform === 'win32';

export const AppHome = path.join(app.getAppPath(), '../../');

export const SP_DESKTOP_HOME = isDevelopment ? 'C:\\xuelangyun\\suanpan-desktop' : path.join(AppHome, '../');