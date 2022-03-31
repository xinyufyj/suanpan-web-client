<template>
  <div id="app" class="drag">
    <div class="container">
      <img class="loader" :src="require('../../assets/close-loading.webp')" />
      <div class="message">
        <div class="main">正在退出雪浪算盘...</div>
        <div class="sub">停止所有运行中的项目后，将自动退出程序。</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      exitStopAll: false
    }
  },
  created() {
    let search = new URLSearchParams(window.location.search);
    let port = search.get("port")
    let exitStopAll = search.get("exitStopAll")
    let host = `http://127.0.0.1:${port}`
    if(exitStopAll === 'true') {
      this.exitStopAll = true
      this.stopAll(host).catch(err => {
        console.error('/app/stop/all', err)
      }).finally(() => {
        this.desktopExit(host).finally(() => {
          window.ipcRenderer.send('app-quit');
        })
      })
    }else {
      this.desktopExit(host).finally(() => {
        window.ipcRenderer.send('app-quit');
      })
    }
  },
  methods: {
    desktopExit(host) {
      return Promise.all([
        fetch(`${host}/desktop/exit`),
        new Promise((resolve) =>
            setTimeout(() => {
              resolve()
            }, 1500)
        )
      ]);
    },
    stopAll(host) {
      return fetch(`${host}/app/stop/all`, {
        method: 'POST'
      })
    },
  }
}
</script>

<style lang="less">
.drag {
    -webkit-app-region: drag;
  }
html,
body,
#app {
  width: 100%;
  height: 100%;
  user-select: none;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, PingFang SC,
    Hiragino Sans GB, Microsoft YaHei, Helvetica Neue, Helvetica, Arial,
    sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;
  font-size: 14px;
  overflow: hidden;
}
.container {
  height: 100%;
  user-select: none;
  display: flex;
  align-items: center;
  flex-direction: row;
  justify-content: center;
}
.loader {
  width: 60px;
  height: 60px;
  // margin-top: 50px;
  // border: 16px solid #f3f3f3; /* Light grey */
  // border-top: 16px solid #1890ff; /* Blue */
  // border-radius: 50%;
  // width: 100px;
  // height: 100px;
  // animation: spin 2s linear infinite;
}
.message {
  margin-left: 20px;
  // font-size: 16px;
  .main {
    font-size: 16px;
    color: #1D2129;
    font-weight: bold;
    line-height: 24px;
  }
  .sub {
    font-size: 12px;
    color: #4E5969;
    line-height: 20px;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>