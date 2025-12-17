# updateDailyInsight 云函数测试指南

## 测试前准备

1. **检查 Coze API 配置**
   - Token: `sat_JBr8tgHf8a8IkpwoFMpNWiioLFdqdAWj9O8HVRZ7DFmYqQf2wKzf92vRqKjQQMdv`
   - Workflow ID: `7583167143870382106`
   - 确保 Coze 账号有足够的调用配额

3. **检查数据库表**
   - 确保 `test_daily_insights` 测试表已创建
   - 建议为 `cardNumber` 字段创建唯一索引（防止重复数据）

## 测试步骤

### 1. 本地测试（推荐）

在微信开发者工具中测试：

```javascript
// 在开发者工具的"云开发"面板 → "云函数" → "updateDailyInsight" → 点击"测试"

// 测试用例1: 批量更新所有60甲子（默认并发5个）
{}

// 测试用例2: 指定并发数量（10个并发）
{
  "concurrency": 10
}

// 测试用例3: 指定并发数量和批次延迟
{
  "concurrency": 5,      // 每批并发5个
  "batchDelayMs": 2000   // 批次间延迟2秒
}
```

### 2. 小程序端测试

在小程序页面中调用：

```javascript
// pages/test/index.js
Page({
  async testUpdateDailyInsight() {
    wx.showLoading({ title: '更新中...' });
    
    try {
      wx.showLoading({ title: '批量更新中，预计2-3分钟...' });
      
      const result = await wx.cloud.callFunction({
        name: 'updateDailyInsight',
        data: {}  // 批量更新所有60甲子
      });
      
      wx.hideLoading();
      
      console.log('云函数返回:', result);
      
      if (result.result.success) {
        wx.showToast({
          title: `成功${result.result.data.successCount}条`,
          icon: 'success',
          duration: 3000
        });
        
        console.log('总数:', result.result.data.total);
        console.log('成功:', result.result.data.successCount);
        console.log('失败:', result.result.data.errorCount);
        console.log('耗时:', result.result.data.totalTime, '秒');
      } else {
        wx.showToast({
          title: result.result.error,
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('调用失败:', error);
      wx.showToast({
        title: '调用失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  }
});
```

### 3. 查看云函数日志

在云开发控制台查看详细日志：

1. 进入"云开发控制台"
2. 选择"云函数" → "updateDailyInsight"
3. 点击"日志"选项卡
4. 查看最近的执行日志

**关键日志输出：**

```
[updateDailyInsight] 云函数被调用
[updateDailyInsight] 接收参数: {...}
[updateDailyInsight] 开始更新日报数据
[步骤1] 获取干支信息...
[getGanZhiForDate] 获取的干支信息: {...}
[步骤2] 生成卡牌基础信息...
[generateCardBaseInfo] 生成的基础信息: {...}
[步骤3] 调用Coze工作流获取日报解读...
[callCozeWorkflow] Coze API 响应: {...}
[步骤4] 合并数据...
[updateDailyInsight] 完整的卡牌数据: {...}
[步骤5] 保存到数据库...
[saveDailyInsight] 更新现有记录 / 插入新记录
[updateDailyInsight] 更新日报数据成功
```

### 4. 验证数据库

在云开发控制台查看数据：

1. 进入"云开发控制台"
2. 选择"数据库" → "test_daily_insights"
3. 查看是否有新增或更新的记录

**验证字段：**

```javascript
{
  "_id": "...",
  "cardName": "己未",             // ✅ 干支名称正确
  "cardNumber": 56,               // ✅ 卡牌编号正确（1-60），唯一标识
  "seasonMark": "夏夏",           // ✅ 季节标记
  "talentMark": "战斗力",         // ✅ 天赋标记
  "abilityMark": "5",             // ✅ 才能标记（1-6）
  "pathMark": "精与义",           // ✅ 路径标记
  "central": "",                  // ✅ 留空（暂不需要）
  "blessing": "今天可以...",      // ✅ Coze生成的祝福语
  "tip": "注意避免...",           // ✅ Coze生成的提示
  "password": "精战守衡",         // ✅ Coze生成的通关密码
  "createdAt": "2025-01-20T...",  // ✅ 创建时间
  "updatedAt": "2025-01-20T...",  // ✅ 更新时间
  "isActive": true                // ✅ 是否有效
}
```

**验证要点：**
- 应该有60条记录（对应60个甲子）
- 每个 `cardNumber` 唯一（1-60）
- 所有必填字段都有值
- Coze 返回的字段（blessing、tip、password）都有内容

## 常见问题排查

### 问题1：部分干支处理失败

**错误信息：** `处理失败: ...`

**排查步骤：**
1. 查看云函数日志，确认是哪个干支失败
2. 检查 Coze API 调用是否成功
3. 检查数据库权限是否正确

### 问题2：Coze API 调用失败

**错误信息：** `Coze API请求失败: ...` 或 `请求超时`

**排查步骤：**
1. 检查 Coze API Token 是否有效
2. 检查 Workflow ID 是否正确
3. 检查 Coze 账号配额是否用完
4. 检查网络连接

**常见错误码：**
- `4028`: 免费配额已用完
- `401`: Token 无效或过期
- `429`: 请求过于频繁

### 问题3：数据保存失败

**错误信息：** `保存日报数据失败: ...`

**排查步骤：**
1. 检查 `test_daily_insights` 表是否存在
2. 检查云函数是否有数据库写权限
3. 查看数据库错误日志

### 问题4：数据重复

**现象：** 同一 `cardNumber` 存在多条记录

**解决方案：**
1. 为 `cardNumber` 字段创建唯一索引
2. 删除重复记录
3. 重新运行云函数

**创建唯一索引步骤：**
```
云开发控制台 → 数据库 → test_daily_insights → 索引 → 新建索引
- 索引名称: idx_cardNumber_unique
- 索引字段: cardNumber
- 索引类型: 唯一索引
- 排序方式: 升序
```

## 性能测试

### 测试单次执行时间

```javascript
// 记录开始时间
const startTime = Date.now();

const result = await wx.cloud.callFunction({
  name: 'updateDailyInsight',
  data: {}
});

// 记录结束时间
const endTime = Date.now();
const duration = (endTime - startTime) / 1000;

console.log('执行时间:', duration, '秒');
```

**预期执行时间：** 约12-24分钟（60个干支 ÷ 5并发 × 1-2分钟/批）

### 测试执行时间

```javascript
// 记录开始时间
const startTime = Date.now();

const result = await wx.cloud.callFunction({
  name: 'updateDailyInsight',
  data: {
    concurrency: 5,      // 并发5个
    batchDelayMs: 1000   // 批次间延迟1秒
  }
});

// 记录结束时间
const endTime = Date.now();
const duration = (endTime - startTime) / 1000;

console.log('执行时间:', duration, '秒');
console.log('成功数量:', result.result.data.successCount);
console.log('失败数量:', result.result.data.errorCount);
console.log('并发数:', result.result.data.concurrency);
```

**预期执行时间：** 约12-24分钟（60个干支 ÷ 5并发 × 1-2分钟/批）

**说明：**
- Coze接口可能需要1-2分钟才能返回结果
- 并发5个时，每批约1-2分钟，共12批
- 如果Coze接口响应更快，总时间会相应缩短

## 测试检查清单

- [ ] 本地测试通过（开发者工具）
- [ ] 小程序端调用成功
- [ ] 云函数日志完整无错误
- [ ] 数据库记录正确保存
- [ ] 所有必填字段均有值
- [ ] Coze 返回的字段正确解析
- [ ] 重复执行时正确更新（不新增）
- [ ] 错误情况处理正常

## 下一步

测试通过后：

1. **部署云函数**
   ```bash
   # 在云函数目录执行
   npm install
   # 然后在开发者工具中右键上传云函数
   ```

2. **配置定时触发器**
   - 参考 README.md 中的"配置定时触发器"章节

3. **监控运行**
   - 前几天每天检查日志
   - 确认数据正确生成
   - 调整配置（如有需要）

---

**最后更新：** 2025-01-17

