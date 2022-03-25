<template>
  <div id="app">
    <div class="container">
      <div class="content">
        <ul class="exit-type-wrap">
          <li class="exit-type-item" @click="exitTypeClicked(0)">
            <div :class="['radio-icon', { selected: quitMode === 0 }]"></div>
            <span class="radio-label">退出算盘</span>
          </li>
          <li class="exit-type-item" @click="exitTypeClicked(1)">
            <div :class="['radio-icon', { selected: quitMode === 1 }]"></div>
            <span class="radio-label">最小化到系统托盘</span>
          </li>
        </ul>
        <div v-show="quitMode !== -1" class="tip">（可在设置中修改）</div>
        <div class="buttons">
          <button class="btn" @click="confirm">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      nextTimeNotShow: false,
      quitMode: -1, // -1: 未选, 0: 退出算盘, 1: 最小化到系统托盘
    };
  },
  methods: {
    exitTypeClicked(quitMode) {
      this.quitMode = quitMode
    },
    confirm() {
      let exitProgramDirectly = null
      if(this.quitMode === 0) {
        exitProgramDirectly = true
      }else if(this.quitMode === 1) {
        exitProgramDirectly = false
      }
      if(this.quitMode === 0 || this.quitMode === 1) {
        window.ipcRenderer.send("dialog-confirm", {
          exitProgramDirectly: exitProgramDirectly
        });
      }
    },
  },
};
</script>

<style lang="less">
* {
  margin: 0;
  box-sizing: border-box;
}
html,
body,
#app {
  width: 100%;
  height: 100%;
  font-size: 14px;
  overflow: hidden;
}
.container {
  user-select: none;
  width: 80%;
  margin: 0 auto;
  .content {
    padding-top: 10px;
  }
  .exit-type-wrap {
    padding-left: 0;
    list-style-type: none;
    font-size: 13px;
  }
  .exit-type-item {
    cursor: pointer;
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }
}
.tip {
  position: absolute;
  font-size: 12px;
  color: #4f5458;
}
.radio-icon {
  position: relative;
  display: block;
  width: 16px;
  height: 16px;
  background-color: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 100px;
  &:hover {
    border-color: #1890ff;
  }
  &.selected::after {
    content: '';
    position: absolute;
    display: block;
    top: 3px;
    left: 3px;
    width: 8px;
    height: 8px;
    background: #1890ff;
    border-radius: 100%;
  }
}
.radio-label {
  margin-left: 10px;
}
.btn {
      line-height: 1.499;
      position: relative;
      display: inline-block;
      font-weight: 400;
      white-space: nowrap;
      text-align: center;
      background-image: none;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
      user-select: none;
      height: 30px;
      padding: 0 15px;
      font-size: 13px;
      border-radius: 4px;
      border: 1px solid #1890ff;
      color: #fff;
      background-color: #1890ff;
      &:hover {
        background-color: #40a9ff;
        border-color: #40a9ff;
      }
    }
.buttons {
  padding-top: 24px;
  padding-right: 40px;
  // width: 50%;
  display: flex;
  justify-content: space-between;
}
</style>