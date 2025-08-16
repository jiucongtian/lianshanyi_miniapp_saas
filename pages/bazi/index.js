import { calculateBazi } from '../../utils/baziCalculator';
import Message from 'tdesign-miniprogram/message/index';

Page({
  data: {
    yearPillar: { heavenlyStem: '', earthlyBranch: '' },
    monthPillar: { heavenlyStem: '', earthlyBranch: '' },
    dayPillar: { heavenlyStem: '', earthlyBranch: '' },
    timePillar: { heavenlyStem: '', earthlyBranch: '' },
    originalTime: '',
    warnings: {
      isNearSolarTerm: false,
      isZiTime: false
    }
  },

  onLoad(options) {
    if (!options.datetime) {
      console.error('未接收到时间参数');
      Message.error({
        context: this,
        offset: [20, 32],
        duration: 3000,
        content: '参数错误，请重新选择时间',
      });
      setTimeout(() => wx.navigateBack(), 2000);
      return;
    }

    console.log('收到时间参数：', options.datetime);
    
    try {
      const timestamp = parseInt(options.datetime);
      if (isNaN(timestamp)) {
        throw new Error('时间格式错误');
      }
      
      const date = new Date(timestamp);
      if (date.toString() === 'Invalid Date') {
        throw new Error('无效的日期');
      }

      console.log('解析后的日期：', date);
      
      const result = calculateBazi(date);
      console.log('八字计算结果：', result);
      
      this.setData({
        yearPillar: result.yearPillar,
        monthPillar: result.monthPillar,
        dayPillar: result.dayPillar,
        timePillar: result.timePillar,
        warnings: result.warnings,
        originalTime: this.formatDateTime(date)
      });

      // 显示警告信息
      if (result.warnings.isNearSolarTerm) {
        Message.warning({
          context: this,
          offset: [20, 32],
          duration: 3000,
          content: '注意：当前时间接近节气交接点，八字可能会有变化',
        });
      }

      if (result.warnings.isZiTime) {
        Message.info({
          context: this,
          offset: [20, 32],
          duration: 3000,
          content: '注意：子时跨日时段，八字已按传统历法处理',
        });
      }
    } catch (error) {
      console.error('八字计算错误：', error);
      Message.error({
        context: this,
        offset: [20, 32],
        duration: 3000,
        content: error.message || '计算出错，请重试',
      });
      
      // 错误发生时返回上一页
      setTimeout(() => wx.navigateBack(), 2000);
    }
  },

  formatDateTime(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${year}年${month}月${day}日 ${hour}:${minute}`;
  },

  goBack() {
    wx.navigateBack();
  }
});
