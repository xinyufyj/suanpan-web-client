<template>
  <div id="app">
    <div class="container">
      <div class="content">
        <div class="tip-top">下次关闭主面板时，你希望：</div>
        <ul class="exit-type-wrap">
          <li class="exit-type-item" @click="exitTypeClicked(1)">
            <div :class="['radio-icon', { selected: quitMode === 1 }]"></div>
            <span class="radio-label">最小化到系统托盘，不退出程序</span>
          </li>
          <li class="exit-type-item" @click="exitTypeClicked(0)">
            <div :class="['radio-icon', { selected: quitMode === 0 }]"></div>
            <span class="radio-label">退出算盘</span>
          </li>
        </ul>
        <div class="tip">（可在“设置”-“通用设置”中进行修改）</div>
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
  padding: 0;
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
    color: #1D2129;
  }
  .exit-type-wrap {
    padding-left: 0;
    list-style-type: none;
    font-size: 14px;
  }
  .exit-type-item {
    cursor: pointer;
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    height: 50px;
    border: 1px solid #E5E6EB;
    border-radius: 4px;
    padding: 0 16px;
    &:hover {
      background: #E6F7FF;
      border: 1px solid #91D5FF;
    }
  }
}
.tip-top {
  margin-top: 16px;
  margin-bottom: 10px;
}
.tip {
  font-size: 12px;
  color: #86909C;
  margin-top: 5px;
  margin-bottom: 16px;
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
  width: 100%;
  // line-height: 1.5;
  position: relative;
  display: inline-block;
  font-weight: 400;
  white-space: nowrap;
  text-align: center;
  background-image: none;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
  user-select: none;
  height: 32px;
  font-size: 14px;
  border-radius: 2px;
  border: 1px solid #0084FF;
  color: #fff;
  background-color: #0084FF;
  &:hover {
    background-color: #40a9ff;
    border-color: #40a9ff;
  }
}
.buttons {
  width: 100%;
}
</style>