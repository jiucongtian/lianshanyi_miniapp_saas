// app.js
import config from './config/index';
import Mock from './mock/index';
import createBus from './utils/eventBus';
const { userManager } = require('./utils/userManager');

if (config.useMock) {
  Mock();
}

App({
  onLaunch() {
    console.log('小程序启动，开始初始化...');
    
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        // env 参数说明：
        //   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
        //   此处请填入环境 ID, 环境 ID 可打开云控制台查看
        //   如不填则使用默认环境（第一个创建的环境）
        env: 'cloudbase-8g06skyf81a65a87', // 云环境ID - 由构建脚本自动生成
        traceUser: true,
      })
    }

    // 自动保存用户信息
    this.autoSaveUser();

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

  onShow() {
    console.log('小程序进入前台');
    // 每次小程序进入前台时也更新用户信息
    this.autoSaveUser();
  },
  globalData: {
    userInfo: null,
    currentProfileId: null, // 当前选中的档案ID
  },

  /** 全局事件总线 */
  eventBus: createBus(),

  /**
   * 自动保存用户信息到数据库
   */
  async autoSaveUser() {
    try {
      console.log('App: 开始自动保存用户信息...');
      
      // 使用用户管理器初始化用户
      const result = await userManager.initUser();
      
      if (result.success) {
        console.log('App: 用户信息保存成功:', result.message);
        
        // 更新全局用户信息
        this.globalData.userInfo = result.data;
        
        // 触发用户信息更新事件
        this.eventBus.emit('userInfoUpdated', result.data);
        
        // 显示欢迎信息
        console.log(`App: ${result.message}`);
      } else {
        console.error('App: 用户信息保存失败:', result.error);
      }
    } catch (error) {
      console.error('App: 自动保存用户信息出错:', error);
    }
  },

  /**
   * 获取当前用户信息
   * @returns {Object|null} 当前用户信息
   */
  getCurrentUser() {
    return userManager.getCurrentUser() || this.globalData.userInfo;
  },

  /**
   * 更新用户信息
   * @param {Object} updateData 要更新的用户数据
   * @returns {Promise<Object>} 更新结果
   */
  async updateUserInfo(updateData) {
    try {
      const result = await userManager.updateUserInfo(updateData);
      
      if (result.success) {
        // 更新全局数据
        this.globalData.userInfo = result.data;
        
        // 触发更新事件
        this.eventBus.emit('userInfoUpdated', result.data);
      }
      
      return result;
    } catch (error) {
      console.error('App: 更新用户信息失败:', error);
      return {
        success: false,
        error: error.message || '更新失败'
      };
    }
  }
});
