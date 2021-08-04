module.exports = {
  pluginOptions: {
    electronBuilder: {
      mainProcessFile: "src/background.js",
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