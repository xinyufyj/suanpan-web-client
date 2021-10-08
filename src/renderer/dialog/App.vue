<template>
  <div id="app">
    <div class="container">
      <div class="content">
        <div class="ant-form-item-control">
          <span class="ant-form-item-children">
            <label class="ant-checkbox-wrapper">
              <span class="ant-checkbox">
                <input
                  type="checkbox"
                  class="ant-checkbox-input"
                  v-model="nextTimeNotShow"
                />
                <span class="ant-checkbox-inner"></span>
              </span>
              <span> 记住我的选择，不再提醒 </span>
            </label>
          </span>
        </div>
        <div class="buttons">
          <button class="btn" @click="confirm('tray')">关闭至托盘</button>
          <button class="btn ant-btn-danger" @click="confirm('quit')">退出应用</button>
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
    };
  },
  methods: {
    confirm(action) {
      window.ipcRenderer.send("dialog-confirm", {
        nextTimeNotShow: this.nextTimeNotShow,
        action
      });
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
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, PingFang SC,
    Hiragino Sans GB, Microsoft YaHei, Helvetica Neue, Helvetica, Arial,
    sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;
  font-size: 14px;
}
.container {
  user-select: none;
  width: 80%;
  margin: 0 auto;
  .content {
    padding-top: 20px;
    .tip {
      padding-bottom: 20px;
      color: #333;
      font-size: 16px;
    }
    .ant-form-item-control {
      font-size: 13px;
      position: relative;
      line-height: 40px;
      zoom: 1;
      color: rgba(0, 0, 0, 0.65);
      &::before {
        display: table;
        content: "";
      }
      .ant-form-item-children {
        position: relative;
        .ant-checkbox-wrapper {
          position: relative;
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          color: rgba(0, 0, 0, 0.65);
          font-size: 14px;
          font-variant: tabular-nums;
          line-height: 1.5;
          list-style: none;
          font-feature-settings: "tnum";
          display: inline-block;
          line-height: unset;
          cursor: pointer;
        }
        .ant-checkbox + span {
          padding-right: 8px;
          padding-left: 8px;
        }
      }
      .ant-checkbox {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        color: rgba(0, 0, 0, 0.65);
        font-size: 14px;
        font-variant: tabular-nums;
        line-height: 1.5;
        list-style: none;
        font-feature-settings: "tnum";
        position: relative;
        top: -0.09em;
        display: inline-block;
        line-height: 1;
        white-space: nowrap;
        vertical-align: middle;
        outline: none;
        cursor: pointer;
      }
    }
  }
  .footer {
    width: 100%;
    text-align: right;
    margin-top: 20px;
  }
}
input[type="checkbox"] {
  width: 14px;
  height: 14px;
}
.btn {
      -webkit-appearance: button;
      text-shadow: 0 -1px 0 rgb(0 0 0 / 12%);
      line-height: 1.499;
      position: relative;
      display: inline-block;
      font-weight: 400;
      white-space: nowrap;
      text-align: center;
      background-image: none;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      touch-action: manipulation;
      height: 32px;
      padding: 0 15px;
      font-size: 14px;
      border-radius: 4px;
      color: rgba(0, 0, 0, 0.65);
      background-color: #fff;
      border: 1px solid #d9d9d9;
      color: #fff;
      background-color: #1890ff;
      border-color: #1890ff;

      &:hover {
        color: #fff;
        background-color: #40a9ff;
        border-color: #40a9ff;
      }
    }
.buttons {
  padding-top: 16px;
  // width: 50%;
  display: flex;
  justify-content: space-around;
}
.ant-btn-danger {
  color: #fff;
  background-color: #ff4d4f;
  border-color: #ff4d4f;
  text-shadow: 0 -1px 0 rgb(0 0 0 / 12%);
  &:hover {
    color: #fff;
    background-color: #d9363e;
    border-color: #d9363e;
  }
}
</style>