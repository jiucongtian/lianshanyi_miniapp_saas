// app.js
import config from './config';
import Mock from './mock/index';
import createBus from './utils/eventBus';

if (config.isMock) {
  Mock();
}

App({
  onLaunch() {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        // env 参数说明：
        //   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
        //   此处请填入环境 ID, 环境 ID 可打开云控制台查看
        //   如不填则使用默认环境（第一个创建的环境）
        env: 'cloud1-9gmddzrkb0fa17c9', // 云环境ID - 由构建脚本自动生成
        traceUser: true,
      })
    }

    const updateManager = wx.getUpdateManager();

    updateManager.onCheckForUpdate((res) => {
      // console.log(res.hasUpdate)
    });

    updateManager.onUpdateReady(() => {
      wx.showModal({
        title: '更新提示',
        content: '新版本已经准备好，是否重启应用？',
        success(res) {
          if (res.confirm) {
            updateManager.applyUpdate();
          }
        },
      });
    });
  },
  globalData: {
    userInfo: null,
  },

  /** 全局事件总线 */
  eventBus: createBus(),
});
