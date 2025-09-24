// pages/card/index.js
// 引入八字图片映射表
const { getBaziImageById, getBaziImageByPinyin } = require('../../utils/baziImageMap');

Page({
  data: {
    profileId: '',       // 当前显示的档案ID
    profileName: '',     // 档案名称
    deviceSize: 'medium',
    showTimePopup: false,
    yearPillar: { 
      heavenlyStem: '甲',
      earthlyBranch: '子',
      imagePath: ''  // 将在onReady中设置
    },
    monthPillar: {
      heavenlyStem: '乙',
      earthlyBranch: '丑',
      imagePath: ''  // 将在onReady中设置
    },
    dayPillar: {
      heavenlyStem: '丙',
      earthlyBranch: '寅',
      imagePath: ''  // 将在onReady中设置
    },
    timePillar: {
      heavenlyStem: '丁',
      earthlyBranch: '卯',
      imagePath: ''  // 将在onReady中设置
    },
    originalTime: '',
    lunarTime: '',
    loading: true
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('卡牌页面接收到的参数:', options);
    
    this.initDeviceSize();
    this.initAnimations();
    
    // 处理传递过来的参数
    this.handleReceivedParams(options);
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {
    // 页面渲染完成后，从全局数据获取八字结果并更新显示
    this.loadBaziFromGlobalData();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    console.log('卡牌页面 onShow 触发');
    
    // 检查全局数据中是否有卡牌数据
    const app = getApp();
    const cardData = app.globalData?.cardData;
    const currentProfileId = this.data.profileId;
    
    console.log('onShow: cardData:', cardData);
    console.log('onShow: currentProfileId:', currentProfileId);
    
    if (cardData && cardData.profileId !== currentProfileId) {
      console.log('onShow: 从全局数据加载卡牌数据');
      this.loadCardDataFromGlobal(cardData);
      // 清除全局数据，避免重复使用
      app.globalData.cardData = null;
    } else if (!cardData && !currentProfileId) {
      console.log('onShow: 没有卡牌数据，显示默认数据');
      this.updateInitialImages();
      this.setData({ loading: false });
    } else {
      console.log('onShow: 无需处理，cardData存在:', !!cardData, 'currentProfileId:', currentProfileId);
      if (!cardData) {
        this.setData({ loading: false });
      }
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadProfileData();
    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    const { yearPillar, monthPillar, dayPillar, timePillar, profileName } = this.data;
    const baziText = `${yearPillar.heavenlyStem}${yearPillar.earthlyBranch} ${monthPillar.heavenlyStem}${monthPillar.earthlyBranch} ${dayPillar.heavenlyStem}${dayPillar.earthlyBranch} ${timePillar.heavenlyStem}${timePillar.earthlyBranch}`;
    
    return {
      title: `${profileName || '生命智慧卡牌'} - ${baziText}`,
      path: '/pages/card/index',
      imageUrl: '', // 可以设置分享图片
    };
  },

  // 从全局数据加载卡牌数据
  loadCardDataFromGlobal(cardData) {
    console.log('loadCardDataFromGlobal 开始执行，cardData:', cardData);
    
    this.setData({ loading: true });
    
    try {
      // 更新档案基本信息
      this.setData({
        profileId: cardData.profileId,
        profileName: cardData.profileName,
        originalTime: cardData.originalTime,
        lunarTime: cardData.lunarTime
      });
      
      // 设置全局当前档案ID
      const app = getApp();
      app.globalData.currentProfileId = cardData.profileId;
      console.log('已设置全局当前档案ID:', cardData.profileId);
      
      // 更新八字显示
      this.updateBaziDisplay(cardData.baziData);
      
      console.log('从全局数据加载卡牌数据成功');
    } catch (error) {
      console.error('从全局数据加载卡牌数据失败:', error);
      this.updateInitialImages();
    } finally {
      this.setData({ loading: false });
    }
  },

  // 处理接收到的参数
  handleReceivedParams(options) {
    const { profileId, datetime, hasCozeData } = options;
    
    // 如果有档案ID，优先加载档案数据
    if (profileId) {
      this.setData({ profileId });
      this.loadProfileData();
      return;
    }
    
    // 检查全局数据中是否有选中的档案ID（来自TabBar跳转）
    const app = getApp();
    const globalProfileId = app.globalData?.selectedProfileId;
    if (globalProfileId) {
      console.log('从全局数据获取档案ID:', globalProfileId);
      this.setData({ profileId: globalProfileId });
      this.loadProfileData();
      // 清除全局数据，避免重复使用
      app.globalData.selectedProfileId = null;
      return;
    }
    
    // 兼容原有的时间参数逻辑
    if (datetime) {
      const timestamp = parseInt(datetime);
      const date = new Date(timestamp);
      
      // 格式化时间显示
      const formattedTime = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
      
      // 检查是否有Coze数据
      if (hasCozeData === 'true') {
        const app = getApp();
        const baziResult = app.globalData?.baziResult;
        
        if (baziResult && baziResult.timestamp === timestamp) {
          console.log('检测到Coze计算结果:', baziResult.cozeData);
          
          // 尝试解析并更新八字显示
          const baziData = this.parseBaziData(baziResult.cozeData);
          if (baziData) {
            this.updateBaziDisplay(baziData);
          }
        }
      }
      
      // 在控制台输出详细信息
      console.log('八字页面参数详情:', {
        timestamp,
        formattedTime,
        hasCozeData,
        globalData: getApp().globalData?.baziResult
      });
    }
  },

  // 加载档案数据
  async loadProfileData() {
    const { profileId } = this.data;
    console.log('loadProfileData 开始执行，profileId:', profileId);
    
    if (!profileId) {
      console.log('没有档案ID，显示默认数据');
      this.updateInitialImages();
      this.setData({ loading: false });
      return;
    }

    this.setData({ loading: true });

    try {
      console.log('准备调用云函数，参数:', { action: 'getProfile', profileId });
      
      const result = await wx.cloud.callFunction({
        name: 'profileManagement',
        data: {
          action: 'getProfile',
          data: {
            profileId: profileId
          }
        }
      });

      console.log('云函数调用结果:', result);

      if (result.result && result.result.success) {
        const profile = result.result.data;
        console.log('加载档案数据成功:', profile);
        console.log('档案八字数据:', profile.baziData);
        
        // 设置全局当前档案ID
        const app = getApp();
        app.globalData.currentProfileId = profileId;
        console.log('已设置全局当前档案ID:', profileId);
        
        // 更新档案信息
        this.setData({
          profileName: profile.profileName,
          originalTime: this.formatBirthTime(profile.birthDate),
          lunarTime: profile.baziData.lunarDate ? this.formatLunarTime(profile.baziData.lunarDate) : ''
        });

        // 更新八字显示
        this.updateBaziFromProfile(profile.baziData);
      } else {
        console.error('获取档案失败:', result.result ? result.result.error : '云函数返回格式错误');
        console.error('完整返回结果:', result);
        wx.showToast({
          title: '档案加载失败',
          icon: 'error'
        });
        this.updateInitialImages();
      }
    } catch (error) {
      console.error('调用云函数失败:', error);
      wx.showToast({
        title: '网络错误',
        icon: 'error'
      });
      this.updateInitialImages();
    } finally {
      this.setData({ loading: false });
    }
  },

  // 从档案数据更新八字显示
  updateBaziFromProfile(baziData) {
    console.log('updateBaziFromProfile 开始执行，baziData:', baziData);
    
    if (!baziData) {
      console.log('baziData 为空，返回');
      return;
    }

    const baziFormatted = {
      yearPillar: {
        heavenlyStem: baziData.year.gan,
        earthlyBranch: baziData.year.zhi
      },
      monthPillar: {
        heavenlyStem: baziData.month.gan,
        earthlyBranch: baziData.month.zhi
      },
      dayPillar: {
        heavenlyStem: baziData.day.gan,
        earthlyBranch: baziData.day.zhi
      },
      timePillar: {
        heavenlyStem: baziData.hour.gan,
        earthlyBranch: baziData.hour.zhi
      }
    };

    console.log('格式化后的八字数据:', baziFormatted);
    this.updateBaziDisplay(baziFormatted);
  },

  // 格式化生日时间
  formatBirthTime(birthDate) {
    const minute = birthDate.minute || 0;
    const minuteStr = minute < 10 ? `0${minute}` : `${minute}`;
    return `${birthDate.year}年${birthDate.month}月${birthDate.day}日 ${birthDate.hour}:${minuteStr}`;
  },

  // 格式化农历时间
  formatLunarTime(lunarDate) {
    return `农历${lunarDate.year}年${lunarDate.month}月${lunarDate.day}日${lunarDate.isLeap ? '(闰月)' : ''}`;
  },

  // 从全局数据加载八字结果
  loadBaziFromGlobalData() {
    // 如果有档案ID，优先使用档案数据
    if (this.data.profileId) {
      return;
    }

    const app = getApp();
    const baziResult = app.globalData?.baziResult;
    
    console.log('全局数据:', baziResult);
    
    if (baziResult && baziResult.cozeData) {
      console.log('找到cozeData:', baziResult.cozeData);
      
      // 解析八字数据
      const baziData = this.parseBaziData(baziResult.cozeData);
      
      if (baziData) {
        console.log('解析成功，更新显示:', baziData);
        this.updateBaziDisplay(baziData);
      } else {
        console.log('八字数据解析失败，显示默认数据');
        this.updateInitialImages();
      }
    } else {
      console.log('未找到全局八字数据，显示默认数据');
      this.updateInitialImages();
    }
    
    this.setData({ loading: false });
  },

  // 解析八字数据
  parseBaziData(cozeData) {
    try {
      console.log('=== 开始解析八字数据 ===');
      console.log('cozeData 完整结构:', JSON.stringify(cozeData, null, 2));
      console.log('cozeData.data 类型:', typeof cozeData?.data);
      console.log('cozeData.data 内容:', cozeData?.data);
      
      // 根据实际数据格式: cozeData.data 是一个JSON字符串
      if (cozeData && cozeData.data) {
        const dataString = cozeData.data;
        console.log('准备解析的 dataString:', dataString);
        
        let parsedData;
        try {
          parsedData = JSON.parse(dataString);
          console.log('JSON 解析成功，parsedData:', JSON.stringify(parsedData, null, 2));
        } catch (jsonError) {
          console.error('JSON 解析失败:', jsonError);
          console.log('尝试直接使用 cozeData.data:', dataString);
          parsedData = dataString;
        }
        
        console.log('最终解析后的数据:', parsedData);
        
        // 数据格式: {"output":{"day":"甲戌","hour":"戊辰","month":"甲申","year":"乙巳"}}
        if (parsedData.output) {
          const output = parsedData.output;
          return {
            yearPillar: {
              heavenlyStem: output.year[0],  // 乙
              earthlyBranch: output.year[1]  // 巳
            },
            monthPillar: {
              heavenlyStem: output.month[0], // 甲
              earthlyBranch: output.month[1] // 申
            },
            dayPillar: {
              heavenlyStem: output.day[0],   // 甲
              earthlyBranch: output.day[1]   // 戌
            },
            timePillar: {
              heavenlyStem: output.hour[0],  // 戊
              earthlyBranch: output.hour[1]  // 辰
            }
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('解析八字数据时出错:', error);
      return null;
    }
  },

  // 更新八字显示
  updateBaziDisplay(baziData) {
    console.log('开始更新八字显示，数据:', baziData);
    
    if (baziData && baziData.yearPillar && baziData.monthPillar && baziData.dayPillar && baziData.timePillar) {
      // 生成图片路径
      const yearImagePath = this.getBaziImagePath(baziData.yearPillar.heavenlyStem, baziData.yearPillar.earthlyBranch);
      const monthImagePath = this.getBaziImagePath(baziData.monthPillar.heavenlyStem, baziData.monthPillar.earthlyBranch);
      const dayImagePath = this.getBaziImagePath(baziData.dayPillar.heavenlyStem, baziData.dayPillar.earthlyBranch);
      const timeImagePath = this.getBaziImagePath(baziData.timePillar.heavenlyStem, baziData.timePillar.earthlyBranch);
      
      console.log('生成的图片路径:', {
        year: yearImagePath,
        month: monthImagePath,
        day: dayImagePath,
        time: timeImagePath
      });
      
      this.setData({
        yearPillar: {
          heavenlyStem: baziData.yearPillar.heavenlyStem,
          earthlyBranch: baziData.yearPillar.earthlyBranch,
          imagePath: yearImagePath
        },
        monthPillar: {
          heavenlyStem: baziData.monthPillar.heavenlyStem,
          earthlyBranch: baziData.monthPillar.earthlyBranch,
          imagePath: monthImagePath
        },
        dayPillar: {
          heavenlyStem: baziData.dayPillar.heavenlyStem,
          earthlyBranch: baziData.dayPillar.earthlyBranch,
          imagePath: dayImagePath
        },
        timePillar: {
          heavenlyStem: baziData.timePillar.heavenlyStem,
          earthlyBranch: baziData.timePillar.earthlyBranch,
          imagePath: timeImagePath
        }
      });
      
      console.log('八字显示已更新，当前数据:', this.data);
    } else {
      console.log('八字数据不完整，无法更新显示');
    }
  },

  // 初始化时更新图片路径（作为后备方案）
  updateInitialImages() {
    const { yearPillar, monthPillar, dayPillar, timePillar } = this.data;
    
    this.setData({
      'yearPillar.imagePath': this.getBaziImagePath(yearPillar.heavenlyStem, yearPillar.earthlyBranch),
      'monthPillar.imagePath': this.getBaziImagePath(monthPillar.heavenlyStem, monthPillar.earthlyBranch),
      'dayPillar.imagePath': this.getBaziImagePath(dayPillar.heavenlyStem, dayPillar.earthlyBranch),
      'timePillar.imagePath': this.getBaziImagePath(timePillar.heavenlyStem, timePillar.earthlyBranch)
    });
  },

  initDeviceSize() {
    wx.getSystemInfo({
      success: (res) => {
        const deviceSize = res.screenWidth < 375 ? 'small' : 
                         res.screenWidth < 414 ? 'medium' : 'large';
        this.setData({ deviceSize });
      }
    });
  },

  initAnimations() {
    const pillars = ['year', 'month', 'day', 'time'];
    const delay = 100; // 每个柱子的动画延迟时间（毫秒）

    pillars.forEach((pillar, index) => {
      const animation = wx.createAnimation({
        duration: 500,
        timingFunction: 'ease',
        delay: index * delay
      });

      animation.opacity(1).translateY(0).step();
      this.setData({
        [`${pillar}Animation`]: animation.export()
      });
    });
  },

  // 显示时间详情
  showTimeDetail() {
    this.setData({ showTimePopup: true });
  },

  // 关闭时间详情
  closeTimePopup() {
    this.setData({ showTimePopup: false });
  },

  // 处理弹出层状态变化
  onTimePopupChange(e) {
    this.setData({ showTimePopup: e.detail.visible });
  },

  // 根据天干地支获取对应的图片路径
  getBaziImagePath(heavenlyStem, earthlyBranch) {
    // 将天干地支转换为拼音
    const tianGanMap = {
      '甲': 'jia', '乙': 'yi', '丙': 'bing', '丁': 'ding', '戊': 'wu',
      '己': 'ji', '庚': 'geng', '辛': 'xin', '壬': 'ren', '癸': 'gui'
    };
    
    const diZhiMap = {
      '子': 'zi', '丑': 'chou', '寅': 'yin', '卯': 'mao', '辰': 'chen', '巳': 'si',
      '午': 'wu', '未': 'wei', '申': 'shen', '酉': 'you', '戌': 'xu', '亥': 'hai'
    };
    
    const tianGanPinyin = tianGanMap[heavenlyStem];
    const diZhiPinyin = diZhiMap[earthlyBranch];
    
    if (tianGanPinyin && diZhiPinyin) {
      const pinyin = tianGanPinyin + diZhiPinyin;
      const imageInfo = getBaziImageByPinyin(pinyin);
      return imageInfo ? imageInfo.imagePath : '/static/new_bazi/01_jiazi.jpeg';
    }
    
    return '/static/new_bazi/01_jiazi.jpeg'; // 默认图片
  }
})
