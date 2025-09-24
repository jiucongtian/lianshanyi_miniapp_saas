# 全局卡牌数据结构方案

## 概述
实现一个全局的数据结构来存储卡牌页面需要显示的信息，在从档案页面跳转到卡牌页面前，直接使用当前点击条目的数据去填充这个全局数据结构，然后再跳转到卡牌页面。

## 优势
1. **性能优化**：避免重复的云函数调用
2. **数据一致性**：直接使用档案列表中已有的数据
3. **响应速度**：无需等待网络请求，立即显示
4. **用户体验**：消除加载等待时间

## 全局数据结构

### app.globalData.cardData 结构
```javascript
app.globalData.cardData = {
  // 档案基本信息
  profileId: "档案ID",
  profileName: "档案名称",
  originalTime: "格式化的生日时间",
  lunarTime: "格式化的农历时间",
  
  // 八字数据（卡牌显示核心数据）
  baziData: {
    yearPillar: {
      heavenlyStem: "年干",    // 如：甲
      earthlyBranch: "年支"    // 如：子
    },
    monthPillar: {
      heavenlyStem: "月干",
      earthlyBranch: "月支"
    },
    dayPillar: {
      heavenlyStem: "日干",
      earthlyBranch: "日支"
    },
    timePillar: {
      heavenlyStem: "时干",
      earthlyBranch: "时支"
    }
  }
}
```

## 实现流程

### 1. 档案页面跳转逻辑
**文件**: `pages/profile/index.js`

```javascript
onProfileTap(e) {
  const profileId = e.currentTarget.dataset.id;
  
  // 从当前档案列表中找到点击的档案数据
  const selectedProfile = this.data.profileList.find(profile => profile._id === profileId);
  
  // 构建卡牌页面需要的完整数据结构
  app.globalData.cardData = {
    profileId: selectedProfile._id,
    profileName: selectedProfile.profileName,
    originalTime: this.formatBirthTimeForCard(selectedProfile.birthDate),
    lunarTime: selectedProfile.baziData.lunarDate ? this.formatLunarTimeForCard(selectedProfile.baziData.lunarDate) : '',
    baziData: {
      yearPillar: {
        heavenlyStem: selectedProfile.baziData.year.gan,
        earthlyBranch: selectedProfile.baziData.year.zhi
      },
      // ... 其他柱数据
    }
  };
  
  // 跳转到卡牌页面
  wx.switchTab({ url: '/pages/card/index' });
}
```

### 2. 卡牌页面数据加载
**文件**: `pages/card/index.js`

```javascript
onShow() {
  // 检查全局数据中是否有卡牌数据
  const app = getApp();
  const cardData = app.globalData?.cardData;
  
  if (cardData && cardData.profileId !== this.data.profileId) {
    // 从全局数据加载卡牌数据
    this.loadCardDataFromGlobal(cardData);
    // 清除全局数据，避免重复使用
    app.globalData.cardData = null;
  }
}

loadCardDataFromGlobal(cardData) {
  // 更新档案基本信息
  this.setData({
    profileId: cardData.profileId,
    profileName: cardData.profileName,
    originalTime: cardData.originalTime,
    lunarTime: cardData.lunarTime
  });
  
  // 更新八字显示
  this.updateBaziDisplay(cardData.baziData);
}
```

## 数据转换映射

### 档案数据库格式 → 全局卡牌数据格式

```javascript
// 档案数据库格式
selectedProfile = {
  _id: "档案ID",
  profileName: "档案名称",
  birthDate: {
    year: 1990,
    month: 5,
    day: 15,
    hour: 14,
    minute: 30
  },
  baziData: {
    year: { gan: "甲", zhi: "子" },
    month: { gan: "乙", zhi: "丑" },
    day: { gan: "丙", zhi: "寅" },
    hour: { gan: "丁", zhi: "卯" },
    lunarDate: {
      year: 1990,
      month: 4,
      day: 22,
      isLeap: false
    }
  }
}

// 转换为全局卡牌数据格式
app.globalData.cardData = {
  profileId: selectedProfile._id,
  profileName: selectedProfile.profileName,
  originalTime: "1990年5月15日 14:30",
  lunarTime: "农历1990年4月22日",
  baziData: {
    yearPillar: { heavenlyStem: "甲", earthlyBranch: "子" },
    monthPillar: { heavenlyStem: "乙", earthlyBranch: "丑" },
    dayPillar: { heavenlyStem: "丙", earthlyBranch: "寅" },
    timePillar: { heavenlyStem: "丁", earthlyBranch: "卯" }
  }
}
```

## 辅助方法

### 时间格式化方法
**文件**: `pages/profile/index.js`

```javascript
// 格式化生日时间（用于卡牌页面）
formatBirthTimeForCard(birthDate) {
  const minute = birthDate.minute || 0;
  const minuteStr = minute < 10 ? `0${minute}` : `${minute}`;
  return `${birthDate.year}年${birthDate.month}月${birthDate.day}日 ${birthDate.hour}:${minuteStr}`;
}

// 格式化农历时间（用于卡牌页面）
formatLunarTimeForCard(lunarDate) {
  return `农历${lunarDate.year}年${lunarDate.month}月${lunarDate.day}日${lunarDate.isLeap ? '(闰月)' : ''}`;
}
```

## 生命周期管理

### 数据的创建和清理
1. **创建时机**：档案页面点击档案条目时
2. **使用时机**：卡牌页面 `onShow` 生命周期
3. **清理时机**：数据使用后立即清除，避免重复使用

### 状态管理
```javascript
// 创建全局数据
app.globalData.cardData = { /* 卡牌数据 */ };

// 检查数据存在性
if (cardData && cardData.profileId !== currentProfileId) {
  // 使用数据
}

// 清理数据
app.globalData.cardData = null;
```

## 错误处理

### 1. 档案数据不存在
```javascript
const selectedProfile = this.data.profileList.find(profile => profile._id === profileId);
if (!selectedProfile) {
  console.error('未找到档案数据:', profileId);
  wx.showToast({ title: '档案数据异常', icon: 'error' });
  return;
}
```

### 2. 全局数据加载失败
```javascript
try {
  this.updateBaziDisplay(cardData.baziData);
} catch (error) {
  console.error('从全局数据加载卡牌数据失败:', error);
  this.updateInitialImages(); // 显示默认数据
}
```

## 兼容性保持

### 原有功能继续支持
- ✅ 时间查询页面的跳转逻辑
- ✅ 全局八字数据的加载逻辑
- ✅ Coze数据解析功能
- ✅ URL参数传递方式（非TabBar跳转）

### 优先级处理
1. **全局卡牌数据** - 最高优先级（档案跳转）
2. **URL参数** - 中等优先级（直接跳转）
3. **全局八字数据** - 较低优先级（时间查询）
4. **默认数据** - 最低优先级

## 性能优势

### 对比分析
**原方案**：
1. 档案页面 → 存储档案ID → 跳转
2. 卡牌页面 → 读取档案ID → 调用云函数 → 获取数据 → 显示

**新方案**：
1. 档案页面 → 构建完整数据 → 跳转
2. 卡牌页面 → 读取完整数据 → 直接显示

### 性能提升
- **响应时间**：从网络请求时间（200-1000ms）减少到数据读取时间（<10ms）
- **用户体验**：消除加载等待，立即显示内容
- **网络资源**：减少云函数调用次数
- **数据一致性**：避免档案列表与详情页数据不同步

## 调试日志

### 档案页面日志
```javascript
console.log('点击档案:', profileId);
console.log('找到档案数据:', selectedProfile);
console.log('已设置全局卡牌数据:', app.globalData.cardData);
console.log('成功跳转到卡牌页面');
```

### 卡牌页面日志
```javascript
console.log('卡牌页面 onShow 触发');
console.log('onShow: cardData:', cardData);
console.log('onShow: 从全局数据加载卡牌数据');
console.log('loadCardDataFromGlobal 开始执行，cardData:', cardData);
console.log('从全局数据加载卡牌数据成功');
```

## 总结

这个全局数据结构方案通过预先构建完整的卡牌数据，实现了：
1. **零延迟显示**：无需等待网络请求
2. **数据一致性**：直接使用档案列表数据
3. **性能优化**：减少云函数调用
4. **用户体验提升**：消除加载状态

同时保持了系统的兼容性和扩展性，是一个高效且优雅的解决方案。
