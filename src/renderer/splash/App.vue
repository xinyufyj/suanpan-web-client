<template>
  <div id="app" class="drag">
    <div class="content">
      <img class="logo" :src="require('@/assets/logo_new.png')">
      <img class="logo-font" :src="require('@/assets/logo_font.png')">
      <div class="version-text">V{{version}}</div>
      <div class="loading-text">程序载入中{{dot}}</div>
      <div class="cr-wrap">
        <div class="cr-text">工业机器智能混合建模系统</div>
        <div class="cr-desp">Copyright © {{ new Date().getFullYear() }} 雪浪云 All rights reserved.</div>
      </div>
    </div>
    <div class="error-modal" v-show="showError">
      <div class="error-container no-drag">
        <div>
          <p class="error-msg" :title="errorMsg">{{ errorMsg }}</p>
        </div>
        <div v-if="!canfix">
          <button class="btn error-btn" @click="quit">退出</button>
        </div>
        <div v-if="canfix">
          <button class="btn fix-btn" @click="fix" :disabled="fixing">{{ fixing ? '修复中...' : '修复' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      dot: '',
      showError: false,
      errorMsg: '',
      version: '0.0.1',
      canfix: false,
      fixing: false
    }
  },
  created() {
    window.ipcRenderer.on('error-msg', (evt, canfix, msg) => {
      this.fixing = false
      this.showError = true;
      this.errorMsg = msg;
      this.canfix = canfix
    });
    let version = new URLSearchParams(window.location.search).get("version");
    if(version != 'unknown') {
      this.version = version;
    }
  },
  mounted() {
    this.intervalId = setInterval(() => {
      if(this.dot === '') {
        this.dot = '.';
      }else if(this.dot === '.') {
        this.dot = '..';
      }else if(this.dot === '..') {
        this.dot = '...';
      }else if(this.dot === '...') {
        this.dot = '....'
      }else if(this.dot === '....') {
        this.dot = '.....'
      }else if(this.dot === '.....') {
        this.dot = '......'
      }else if(this.dot === '......') {
        this.dot = ''
      }
    }, 500);
  },
  beforeDestroy() {
    window.ipcRenderer.removeAllListeners('error-msg');
  },
  methods: {
    quit() {
      window.ipcRenderer.send('app-quit', this.errorMsg);
    },
    fix() {
      this.fixing = true
      window.ipcRenderer.send('app-fix');
    }
  }
}
</script>

<style>
.drag {
  -webkit-app-region: drag;
}
.no-drag {
  -webkit-app-region: no-drag;
}
* {
  margin: 0;
}
#app {
  width: 100vw;
  height: 100vh;
  user-select: none;
  font-size: 14px;
  background-image: url('~@/assets/splash_bg.png');
  background-position: center;
  background-size: cover;
}
.content {
  padding-left: 76px;
  padding-top: 65px;
}
img {
  display: block;
}
.logo {
  width: 76px;
}
.logo-font {
  width: 147px;
  margin-top: 30px;
}
.version-text {
  margin-top: 12px;
  color: #4A586B;
  font-size: 14px;
}
.loading-text {
  margin-top: 50px;
  font-size: 16px;
  color: #4A586B;
}
.cr-wrap {
  margin-top: 70px;
  font-size: 14px;
  color: #4A586B;
}
.error-modal {
  position: absolute;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  display: flex;
  background: rgba(0, 0, 0, 0.1);

}
.error-container {
  box-sizing: border-box;
  width: 70%;
  height: 30%;
  background: #eee;
  border: 1px solid #ccc;
  padding: 10px;
  text-align: center;
  box-shadow: 2px 2px 2px 1px rgba(0, 0, 0, 0.2);
}
.error-msg {
  color: red;
  font-size: 16px;
  display: -webkit-box;
  max-width: 100%;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.btn {
  margin-top: 40px;
  width: 80px;
  padding: 5px 0;
  cursor: pointer;
  border: 0;
}
.error-btn {
  
}
.fix-btn {
  background: #1890ff;
  color: #fff;
}
.fix-btn:hover {
  background: #40a9ff;
}
.fix-btn[disabled] {
  color: rgba(0, 0, 0, 0.4);
  background: #f5f5f5;
  cursor: not-allowed;
  border: 1px solid #d9d9d9;
}
</style>