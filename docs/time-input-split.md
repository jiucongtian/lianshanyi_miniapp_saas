# 时间输入控件分离说明

## 修改概述

将 `addProfile` 页面中的时间输入组件从单个 `time-input` 控件分离为两个独立的控件：
- 一个用于公历时间输入
- 一个用于农历时间输入

根据用户选择的日历类型（公历/农历）来切换显示对应的控件，确保两个控件的数据完全独立，互不干扰。

## 修改内容

### 1. WXML 修改（index.wxml）

**修改前：** 单个 time-input 控件，通过 `calendarType` 属性动态切换

```xml
<view class="input-group">
  <time-input
    calendarType="{{calendarType}}"
    solarFormatedDateTime="{{solarFormatedDateTime}}"
    lunarFormatedDateTime="{{lunarFormatedDateTime}}"
    bind:tap="onInputTap"
  />
</view>
```

**修改后：** 两个独立的 time-input 控件，通过 `wx:if` 和 `wx:else` 切换显示

```xml
<!-- 时间输入框组件 - 公历 -->
<view class="input-group" wx:if="{{calendarType === 'solar'}}">
  <time-input
    calendarType="solar"
    solarFormatedDateTime="{{solarFormatedDateTime}}"
    lunarFormatedDateTime=""
    bind:tap="onSolarInputTap"
  />
</view>

<!-- 时间输入框组件 - 农历 -->
<view class="input-group" wx:else>
  <time-input
    calendarType="lunar"
    solarFormatedDateTime=""
    lunarFormatedDateTime="{{lunarFormatedDateTime}}"
    bind:tap="onLunarInputTap"
  />
</view>
```

### 2. 页面数据定义（index.js）

**添加农历相关数据字段：**

```javascript
data: {
  // 时间选择相关
  calendarType: 'solar', // 日历类型：solar=公历，lunar=农历，默认公历
  formatedDateTime: '', // 格式化后的时间显示
  showPicker: false,
  isUncertainTime: false, // 是否不确定时辰信息
  initialDateTime: null, // 传递给time-picker的初始时间
  
  // 分别存储公历和农历时间数据
  solarDateTime: null, // 公历时间数据 {year, month, day, hour, minute}
  lunarDateTime: null, // 农历时间数据 {year, month, day, hour, minute, isLeapMonth}
  solarFormatedDateTime: '', // 公历格式化时间显示
  lunarFormatedDateTime: '', // 农历格式化时间显示
}
```

### 3. 事件处理方法（index.js）

**修改前：** 单个 `onInputTap` 方法

**修改后：** 两个独立的事件处理方法

```javascript
// 处理公历输入框点击
onSolarInputTap() {
  log.debug('onSolarInputTap', '点击公历输入框，打开选择器');
  
  // 获取公历时间数据作为初始值
  let initialDateTime = null;
  
  if (this.data.solarDateTime) {
    // 使用已有的公历时间
    initialDateTime = this.data.solarDateTime;
  } else if (this.data.birthDate) {
    // 使用birthDate（通常是公历时间）
    initialDateTime = this.data.birthDate;
  }
  
  // 如果没有时间数据，使用当前系统时间
  if (!initialDateTime) {
    const now = new Date();
    initialDateTime = {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes()
    };
  }
  
  log.debug('onSolarInputTap', '设置公历初始时间:', initialDateTime);
  
  this.setData({
    showPicker: true,
    calendarType: 'solar',
    initialDateTime: initialDateTime
  });
},

// 处理农历输入框点击
onLunarInputTap() {
  log.debug('onLunarInputTap', '点击农历输入框，打开选择器');
  
  // 获取农历时间数据作为初始值
  let initialDateTime = null;
  
  if (this.data.lunarDateTime) {
    // 使用已有的农历时间
    initialDateTime = this.data.lunarDateTime;
  } else if (this.data.birthDate) {
    // 使用birthDate
    initialDateTime = this.data.birthDate;
  }
  
  // 如果没有时间数据，使用当前系统时间
  if (!initialDateTime) {
    const now = new Date();
    initialDateTime = {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes()
    };
  }
  
  log.debug('onLunarInputTap', '设置农历初始时间:', initialDateTime);
  
  this.setData({
    showPicker: true,
    calendarType: 'lunar',
    initialDateTime: initialDateTime
  });
}
```

## 优势

### 1. 数据独立性
- 公历时间和农历时间数据完全分离
- 切换日历类型时不会互相影响
- 每个控件只关注自己的数据

### 2. 代码清晰度
- 两个控件各自的职责明确
- 事件处理逻辑更清晰
- 更容易理解和维护

### 3. 用户体验
- 切换日历类型时，各自的输入状态保持不变
- 减少数据混淆的可能性
- 更符合用户的直觉

## 工作原理

1. **初始状态**：默认显示公历控件（`calendarType: 'solar'`）

2. **用户操作**：
   - 点击"公历/农历"按钮 → 触发 `onCalendarTypeSelect` → 更新 `calendarType`
   - 页面根据 `calendarType` 值自动切换显示对应的 time-input 控件

3. **数据流**：
   - 公历控件：只读写 `solarDateTime` 和 `solarFormatedDateTime`
   - 农历控件：只读写 `lunarDateTime` 和 `lunarFormatedDateTime`
   - Controller 层负责历法转换和数据同步

4. **历法转换**：
   - 由 `AddProfileController` 自动处理
   - 切换日历类型时自动进行公历↔农历转换
   - 确保两边数据保持同步

## 测试建议

### 测试场景 1：创建新档案
1. 选择公历，输入时间
2. 切换到农历，查看是否自动转换
3. 修改农历时间
4. 切换回公历，查看是否正确更新
5. 提交表单，验证数据正确性

### 测试场景 2：编辑现有档案
1. 加载现有档案数据
2. 验证公历和农历显示是否正确
3. 在公历模式下修改时间
4. 切换到农历模式，验证同步
5. 保存更新，验证数据正确性

### 测试场景 3：边界情况
1. 只输入公历时间，不切换到农历
2. 只输入农历时间，不切换到公历
3. 快速切换日历类型多次
4. 输入闰月时间

## 相关文件

- `/miniprogram/pages/addProfile/index.wxml` - 页面模板
- `/miniprogram/pages/addProfile/index.js` - 页面逻辑
- `/miniprogram/controllers/AddProfileController.js` - 业务逻辑
- `/miniprogram/components/time-input/` - 时间输入组件
- `/miniprogram/components/time-picker/` - 时间选择器组件

## 数据持久化与加载

### 1. 保存档案时记录日历类型

在保存档案（创建或更新）时，会根据用户当前选择的日历类型，保存对应的时间数据，并设置 `birthDate.isLunar` 字段：

**创建档案（calculateBazi 方法）：**
```javascript
// 获取当前选择的日历类型
const calendarType = this.page.data.calendarType;

// 根据日历类型选择对应的时间数据
let birthDate = null;
let isLunar = false;

if (calendarType === 'lunar') {
  // 用户选择农历
  birthDate = this.lunarDateTime;
  isLunar = true;
} else {
  // 用户选择公历（默认）
  birthDate = this.solarDateTime;
  isLunar = false;
}

// 构建档案数据，设置 isLunar 标记
const profileData = {
  profileName: this.formData.name.trim(),
  birthDate: {
    ...birthDate,
    isLunar: isLunar,
    isLeapMonth: isLunar ? (birthDate.isLeapMonth || false) : false
  },
  gender: this.formData.gender,
  isUncertainTime: this.isUncertainTime
};
```

**更新档案（updateProfile 方法）：**
同样的逻辑，根据当前选择的日历类型保存对应的时间数据。

### 2. 加载档案时恢复日历类型

在编辑已有档案时，会根据 `birthDate.isLunar` 字段自动选择对应的日历类型：

**加载编辑数据（loadEditingData 方法）：**
```javascript
// 判断档案保存的日历类型
const isLunar = this.birthDate.isLunar || false;
let calendarType = 'solar'; // 默认公历

if (isLunar) {
  // 档案是农历时间
  calendarType = 'lunar';
  this.lunarDateTime = {
    year: this.birthDate.year,
    month: this.birthDate.month,
    day: this.birthDate.day,
    hour: this.birthDate.hour,
    minute: this.birthDate.minute || 0,
    isLeapMonth: this.birthDate.isLeapMonth || false
  };
  const leapPrefix = this.birthDate.isLeapMonth ? '闰' : '';
  this.lunarFormatedDateTime = `${this.birthDate.year}年${leapPrefix}${this.birthDate.month}月${this.birthDate.day}日 ${timeName}`;
} else {
  // 档案是公历时间
  calendarType = 'solar';
  this.solarDateTime = {
    year: this.birthDate.year,
    month: this.birthDate.month,
    day: this.birthDate.day,
    hour: this.birthDate.hour,
    minute: this.birthDate.minute || 0
  };
  this.solarFormatedDateTime = `${this.birthDate.year}年${this.birthDate.month}月${this.birthDate.day}日 ${timeName}`;
}

// 更新页面，设置日历类型
this._setData({
  calendarType: calendarType,
  solarDateTime: this.solarDateTime,
  solarFormatedDateTime: this.solarFormatedDateTime,
  lunarDateTime: this.lunarDateTime,
  lunarFormatedDateTime: this.lunarFormatedDateTime
});
```

### 3. 数据库字段说明

档案保存时使用的关键字段：
- `birthDate.isLunar`：布尔值，标记是否为农历（false=公历，true=农历）
- `birthDate.isLeapMonth`：布尔值，标记农历是否闰月（仅 isLunar=true 时有效）
- `birthDate.year/month/day/hour/minute`：具体的时间数据

### 4. 变化检测逻辑

在更新档案时，会检测数据是否有变化，包括日历类型的变化检测：

**`hasDataChanged()` 方法：**
```javascript
// 检查日历类型是否变化
const currentCalendarType = this.page.data.calendarType;
const currentIsLunar = currentCalendarType === 'lunar';
const originalIsLunar = original.birthDate ? (original.birthDate.isLunar || false) : false;
const calendarTypeChanged = originalIsLunar !== currentIsLunar;

// 检查出生日期是否变化
let birthDateChanged = false;
const currentBirthDate = this.solarDateTime || this.lunarDateTime;
if (original.birthDate && currentBirthDate) {
  birthDateChanged = original.birthDate.year !== currentBirthDate.year ||
                    original.birthDate.month !== currentBirthDate.month ||
                    original.birthDate.day !== currentBirthDate.day ||
                    original.birthDate.hour !== currentBirthDate.hour ||
                    original.birthDate.minute !== currentBirthDate.minute;
  
  // 如果日历类型变化了，也算作日期变化
  if (calendarTypeChanged) {
    birthDateChanged = true;
  }
  
  // 如果是农历，还需要检查闰月标记是否变化
  if (currentIsLunar && !birthDateChanged) {
    const originalIsLeapMonth = original.birthDate.isLeapMonth || false;
    const currentIsLeapMonth = currentBirthDate.isLeapMonth || false;
    if (originalIsLeapMonth !== currentIsLeapMonth) {
      birthDateChanged = true;
    }
  }
}
```

**变化检测包括：**
1. 姓名变化
2. 性别变化
3. 不确定时辰标记变化
4. 出生日期变化（年/月/日/时/分）
5. **日历类型变化（公历↔农历）** ✨ 新增
6. **农历闰月标记变化** ✨ 新增

如果没有任何变化，会提示"信息没有变化，无需更新"，避免不必要的数据库操作。

### 5. 完整的数据流

```
创建档案：
用户选择日历类型（公历/农历）
    ↓
填写对应的时间信息
    ↓
点击"创建信息"按钮
    ↓
根据日历类型保存对应的时间 + 设置 isLunar 标记
    ↓
云函数计算八字并保存到数据库

编辑档案：
打开编辑页面
    ↓
从数据库加载档案数据
    ↓
根据 isLunar 字段判断日历类型
    ↓
自动选择对应的日历类型按钮
    ↓
显示对应的时间输入控件
    ↓
用户修改后点击"更新信息"
    ↓
检查数据是否有变化（包括日历类型）
    ↓
如果有变化 → 根据当前日历类型保存对应的时间
    ↓
如果无变化 → 提示"信息没有变化，无需更新"
```

## 修改日期

2025-10-19

