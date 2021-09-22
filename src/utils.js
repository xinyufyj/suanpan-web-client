import path from 'path';

export const isDevelopment = process.env.NODE_ENV !== 'production';
export const isWindows = process.platform === 'win32';
export const assetsPath = path.resolve(
  !isDevelopment
    ? path.join(process.resourcesPath, "assets")
    : path.join(".", "src", "assets")
);
export const trayIconPath = path.join(assetsPath, "logo.png")