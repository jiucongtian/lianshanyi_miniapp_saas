# 抽卡牌云函数调用示例

## 快速开始

### 1. 基本调用（带问题）

```javascript
wx.cloud.callFunction({
  name: 'cozeFunctions_v1_3',
  data: {
    bazi_name: '甲戌',
    question: '我跟她这趟去香港的旅游，能达到我的目的么？感情能不能迅速升温'
  },
  success: res => {
    console.log('完整返回结果:', res.result);
    
    if (res.result.success) {
      // 成功
      console.log('抽卡结果:', res.result.data);
      console.log('八字组合名:', res.result.bazi_name);
      console.log('咨询问题:', res.result.question);
    } else {
      // 失败
      console.error('错误信息:', res.result.error);
    }
  },
  fail: err => {
    console.error('云函数调用失败:', err);
  }
});
```

### 2. 基本调用（不带问题）

```javascript
wx.cloud.callFunction({
  name: 'cozeFunctions_v1_3',
  data: {
    bazi_name: '乙亥'
  },
  success: res => {
    if (res.result.success) {
      console.log('抽卡结果:', res.result.data);
    }
  }
});
```

## 实际业务场景示例

### 场景 1：抽卡页面完整实现

```javascript
// pages/drawCard/index.js
Page({
  data: {
    baziName: '',
    question: '',
    cardResult: null,
    loading: false,
    showResult: false
  },
  
  // 输入八字组合名
  onBaziNameInput(e) {
    this.setData({ baziName: e.detail.value });
  },
  
  // 输入问题
  onQuestionInput(e) {
    this.setData({ question: e.detail.value });
  },
  
  // 开始抽卡
  async startDrawCard() {
    // 验证输入
    if (!this.data.baziName) {
      wx.showToast({
        title: '请输入八字组合名',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ loading: true, showResult: false });
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'cozeFunctions_v1_3',
        data: {
          bazi_name: this.data.baziName,
          question: this.data.question
        }
      });
      
      if (res.result.success) {
        // 抽卡成功
        this.setData({
          cardResult: res.result.data,
          showResult: true,
          loading: false
        });
        
        // 可以添加抽卡动画效果
        this.playCardAnimation();
        
      } else {
        // 业务失败
        throw new Error(res.result.error);
      }
      
    } catch (error) {
      console.error('抽卡失败:', error);
      
      wx.showModal({
        title: '抽卡失败',
        content: error.message || '网络错误，请重试',
        showCancel: false
      });
      
      this.setData({ loading: false });
    }
  },
  
  // 播放抽卡动画
  playCardAnimation() {
    // 实现你的抽卡动画逻辑
    wx.showToast({
      title: '抽卡成功！',
      icon: 'success'
    });
  },
  
  // 重新抽卡
  resetCard() {
    this.setData({
      cardResult: null,
      showResult: false,
      question: ''
    });
  }
});
```

```xml
<!-- pages/drawCard/index.wxml -->
<view class="container">
  <view class="input-section">
    <view class="input-item">
      <text class="label">八字组合名</text>
      <input 
        class="input" 
        placeholder="请输入八字组合名，如：甲戌"
        value="{{baziName}}"
        bindinput="onBaziNameInput"
      />
    </view>
    
    <view class="input-item">
      <text class="label">咨询问题（可选）</text>
      <textarea 
        class="textarea" 
        placeholder="请输入您的问题，留空则进行通用抽卡"
        value="{{question}}"
        bindinput="onQuestionInput"
        maxlength="200"
      />
    </view>
  </view>
  
  <button 
    class="draw-btn" 
    bindtap="startDrawCard"
    loading="{{loading}}"
    disabled="{{loading}}"
  >
    {{loading ? '抽卡中...' : '开始抽卡'}}
  </button>
  
  <view class="result-section" wx:if="{{showResult}}">
    <view class="result-title">抽卡结果</view>
    <!-- 根据实际返回的数据结构展示结果 -->
    <view class="result-content">
      {{cardResult}}
    </view>
    
    <button class="reset-btn" bindtap="resetCard">重新抽卡</button>
  </view>
</view>
```

### 场景 2：封装为 Service

```javascript
// services/TarotService.js
class TarotService {
  /**
   * 抽卡
   * @param {string} baziName - 八字组合名
   * @param {string} question - 咨询问题（可选）
   * @returns {Promise<Object>} 抽卡结果
   */
  async drawCard(baziName, question = '') {
    try {
      // 参数验证
      if (!baziName || typeof baziName !== 'string' || baziName.trim() === '') {
        throw new Error('八字组合名不能为空');
      }
      
      console.log('[TarotService] 开始抽卡:', {
        baziName,
        hasQuestion: !!question
      });
      
      const res = await wx.cloud.callFunction({
        name: 'cozeFunctions_v1_3',
        data: {
          bazi_name: baziName.trim(),
          question: question ? question.trim() : ''
        }
      });
      
      if (res.result.success) {
        console.log('[TarotService] 抽卡成功');
        return {
          success: true,
          data: res.result.data,
          baziName: res.result.bazi_name,
          question: res.result.question,
          timestamp: res.result.timestamp
        };
      } else {
        throw new Error(res.result.error);
      }
      
    } catch (error) {
      console.error('[TarotService] 抽卡失败:', error);
      
      // 统一错误处理
      let errorMessage = error.message || '抽卡失败';
      
      // 网络错误
      if (error.errMsg && error.errMsg.includes('timeout')) {
        errorMessage = '网络超时，请重试';
      } else if (error.errMsg && error.errMsg.includes('fail')) {
        errorMessage = '网络错误，请检查网络连接';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * 批量抽卡（多个问题）
   * @param {string} baziName - 八字组合名
   * @param {Array<string>} questions - 问题列表
   * @returns {Promise<Array>} 抽卡结果列表
   */
  async drawMultipleCards(baziName, questions) {
    const results = [];
    
    for (const question of questions) {
      const result = await this.drawCard(baziName, question);
      results.push({
        question,
        ...result
      });
      
      // 避免请求过于频繁，每次间隔 1 秒
      await this.delay(1000);
    }
    
    return results;
  }
  
  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 导出单例
export default new TarotService();
```

```javascript
// 在页面中使用 Service
import TarotService from '../../services/TarotService';

Page({
  data: {
    result: null
  },
  
  async onLoad() {
    // 单次抽卡
    const result = await TarotService.drawCard('甲戌', '今天运势如何？');
    
    if (result.success) {
      this.setData({ result: result.data });
      console.log('抽卡结果:', result.data);
    } else {
      wx.showToast({
        title: result.error,
        icon: 'none'
      });
    }
  },
  
  async drawMultiple() {
    // 批量抽卡
    const questions = [
      '今天运势如何？',
      '最近感情会有什么发展？',
      '工作上有什么需要注意的？'
    ];
    
    wx.showLoading({ title: '抽卡中...' });
    
    const results = await TarotService.drawMultipleCards('甲戌', questions);
    
    wx.hideLoading();
    
    console.log('批量抽卡结果:', results);
  }
});
```

### 场景 3：结合档案系统

```javascript
// pages/profileDetail/index.js
// 在档案详情页面中，基于档案的八字信息进行抽卡

Page({
  data: {
    profile: null,  // 档案信息
    cardHistory: [] // 抽卡历史
  },
  
  onLoad(options) {
    const profileId = options.id;
    this.loadProfile(profileId);
  },
  
  // 加载档案
  async loadProfile(profileId) {
    // 从你的档案管理云函数获取档案信息
    const res = await wx.cloud.callFunction({
      name: 'profileManagement',
      data: {
        action: 'getProfile',
        profileId: profileId
      }
    });
    
    if (res.result.success) {
      this.setData({ profile: res.result.data });
    }
  },
  
  // 为这个档案抽卡
  async drawCardForProfile() {
    if (!this.data.profile) {
      wx.showToast({
        title: '档案信息未加载',
        icon: 'none'
      });
      return;
    }
    
    // 假设档案中有八字组合名字段
    const baziName = this.data.profile.baziCombination || '甲戌';
    
    // 弹出输入框让用户输入问题
    wx.showModal({
      title: '请输入问题',
      editable: true,
      placeholderText: '请输入您的问题（可留空）',
      success: async (modalRes) => {
        if (modalRes.confirm) {
          const question = modalRes.content || '';
          
          wx.showLoading({ title: '抽卡中...' });
          
          const res = await wx.cloud.callFunction({
            name: 'cozeFunctions_v1_3',
            data: {
              bazi_name: baziName,
              question: question
            }
          });
          
          wx.hideLoading();
          
          if (res.result.success) {
            // 将抽卡结果添加到历史
            const cardRecord = {
              timestamp: res.result.timestamp,
              question: question,
              result: res.result.data,
              baziName: baziName
            };
            
            this.data.cardHistory.unshift(cardRecord);
            this.setData({ cardHistory: this.data.cardHistory });
            
            // 显示结果
            this.showCardResult(cardRecord);
            
            // 可选：保存到云数据库
            this.saveCardRecord(cardRecord);
          } else {
            wx.showToast({
              title: res.result.error,
              icon: 'none'
            });
          }
        }
      }
    });
  },
  
  // 显示抽卡结果
  showCardResult(record) {
    // 跳转到结果页面或显示弹窗
    wx.navigateTo({
      url: `/pages/cardResult/index?data=${JSON.stringify(record)}`
    });
  },
  
  // 保存抽卡记录到数据库
  async saveCardRecord(record) {
    try {
      await wx.cloud.database().collection('card_records').add({
        data: {
          ...record,
          profileId: this.data.profile._id,
          userId: this.data.profile.userId,
          createTime: new Date()
        }
      });
    } catch (error) {
      console.error('保存抽卡记录失败:', error);
    }
  }
});
```

### 场景 4：定时自动抽卡

```javascript
// 每日自动抽卡功能
class DailyTarotService {
  /**
   * 每日自动抽卡
   * @param {string} baziName - 八字组合名
   * @returns {Promise<Object>} 抽卡结果
   */
  async drawDailyCard(baziName) {
    // 检查今天是否已经抽过卡
    const today = this.getToday();
    const lastDrawDate = wx.getStorageSync('lastDrawDate');
    
    if (lastDrawDate === today) {
      // 今天已经抽过卡，返回缓存结果
      const cachedResult = wx.getStorageSync('todayCardResult');
      if (cachedResult) {
        console.log('[DailyTarot] 使用今日缓存结果');
        return {
          success: true,
          data: cachedResult,
          fromCache: true
        };
      }
    }
    
    // 今天还没抽卡，进行抽卡
    try {
      const res = await wx.cloud.callFunction({
        name: 'cozeFunctions_v1_3',
        data: {
          bazi_name: baziName,
          question: `${today}的运势如何？`
        }
      });
      
      if (res.result.success) {
        // 缓存结果
        wx.setStorageSync('lastDrawDate', today);
        wx.setStorageSync('todayCardResult', res.result.data);
        
        return {
          success: true,
          data: res.result.data,
          fromCache: false
        };
      } else {
        throw new Error(res.result.error);
      }
    } catch (error) {
      console.error('[DailyTarot] 抽卡失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * 获取今日日期字符串
   */
  getToday() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export default new DailyTarotService();
```

## 错误处理完整示例

```javascript
/**
 * 完整的错误处理示例
 */
async function drawCardWithFullErrorHandling(baziName, question = '') {
  try {
    // 1. 参数验证
    if (!baziName || typeof baziName !== 'string') {
      throw new Error('八字组合名格式不正确');
    }
    
    if (baziName.trim().length === 0) {
      throw new Error('八字组合名不能为空');
    }
    
    if (question && question.length > 200) {
      throw new Error('问题长度不能超过200字');
    }
    
    // 2. 显示加载状态
    wx.showLoading({ 
      title: '正在抽卡...',
      mask: true 
    });
    
    // 3. 调用云函数
    const res = await wx.cloud.callFunction({
      name: 'cozeFunctions_v1_3',
      data: {
        bazi_name: baziName.trim(),
        question: question ? question.trim() : ''
      }
    });
    
    // 4. 隐藏加载
    wx.hideLoading();
    
    // 5. 处理业务结果
    if (res.result.success) {
      return {
        success: true,
        data: res.result.data,
        baziName: res.result.bazi_name,
        question: res.result.question
      };
    } else {
      // 业务错误
      let errorMessage = res.result.error || '抽卡失败';
      
      // 根据错误码提供更友好的提示
      switch (res.result.code) {
        case 4028:
          errorMessage = 'Coze 配额已用完，请联系管理员';
          break;
        case 401:
          errorMessage = '认证失败，请重新登录';
          break;
        case 429:
          errorMessage = '请求过于频繁，请稍后再试';
          break;
      }
      
      wx.showModal({
        title: '抽卡失败',
        content: errorMessage,
        showCancel: false
      });
      
      return {
        success: false,
        error: errorMessage
      };
    }
    
  } catch (error) {
    // 6. 系统错误处理
    wx.hideLoading();
    
    console.error('抽卡异常:', error);
    
    let errorMessage = '网络错误，请重试';
    
    // 细化错误类型
    if (error.message) {
      errorMessage = error.message;
    } else if (error.errMsg) {
      if (error.errMsg.includes('timeout')) {
        errorMessage = '网络超时，请重试';
      } else if (error.errMsg.includes('fail')) {
        errorMessage = '网络连接失败，请检查网络';
      }
    }
    
    wx.showModal({
      title: '错误',
      content: errorMessage,
      showCancel: false
    });
    
    return {
      success: false,
      error: errorMessage
    };
  }
}
```

## 调试和测试

```javascript
// 测试函数
async function testDrawCard() {
  console.log('=== 开始测试抽卡功能 ===');
  
  const testCases = [
    {
      name: '测试1：正常抽卡（带问题）',
      data: {
        bazi_name: '甲戌',
        question: '今天运势如何？'
      }
    },
    {
      name: '测试2：正常抽卡（不带问题）',
      data: {
        bazi_name: '乙亥'
      }
    },
    {
      name: '测试3：空八字组合名（应该失败）',
      data: {
        bazi_name: '',
        question: '测试问题'
      }
    },
    {
      name: '测试4：超长问题',
      data: {
        bazi_name: '甲戌',
        question: '这是一个很长很长的问题...'.repeat(10)
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n=== ${testCase.name} ===`);
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'cozeFunctions_v1_3',
        data: testCase.data
      });
      
      console.log('结果:', res.result.success ? '✅ 成功' : '❌ 失败');
      console.log('详细:', res.result);
    } catch (error) {
      console.error('异常:', error);
    }
    
    // 延迟避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n=== 测试完成 ===');
}

// 在控制台运行测试
// testDrawCard();
```

## 总结

这个云函数提供了简单而强大的抽卡功能，你可以：
- ✅ 基于八字组合名进行个性化抽卡
- ✅ 可选地提供具体问题获得针对性解读
- ✅ 封装成 Service 在多处复用
- ✅ 结合档案系统实现更丰富的功能
- ✅ 实现每日自动抽卡等高级功能

开始使用它来为你的用户提供塔罗牌抽卡服务吧！
