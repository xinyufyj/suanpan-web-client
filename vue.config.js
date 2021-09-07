module.exports = {
  pages: {
    splash: {
      entry: "src/renderer/splash/main.js",
      template: "public/splash.html"
    },
  },
  pluginOptions: {
    electronBuilder: {
      mainProcessFile: "src/background.js",
      preload: "src/preload.js",
      builderOptions: {
        productName: "suanpan-client",
        linux: {
          target: "AppImage",
          category: "Utility"
        },
        mac: {
          identity: null
        },
        extraResources: [
          {
            from: "./src/assets/",
            to: "assets",
            filter: ["**/*"]
          }
        ],
        directories: {
          buildResources: "build",
          output: "dist_electron"
        }
      }
    },
  }
};