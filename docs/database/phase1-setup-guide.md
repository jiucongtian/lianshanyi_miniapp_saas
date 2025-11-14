# 阶段一：数据库准备操作指南

本文档提供详细的数据库配置步骤，帮助您在云开发控制台完成阶段一的数据库准备工作。

---

## 任务1：确认/更新 `static_user_types` 表

### 1.1 检查表是否存在

**操作步骤**：
1. 登录 [微信云开发控制台](https://console.cloud.tencent.com/tcb)
2. 进入您的云开发环境
3. 点击左侧菜单「数据库」
4. 在集合列表中查找 `static_user_types` 集合
   - 如果存在，继续下一步
   - 如果不存在，需要先创建集合（见下方说明）

### 1.2 检查字段是否存在

**操作步骤**：
1. 点击 `static_user_types` 集合
2. 查看集合中的数据记录
3. 检查是否有 `dailyDrawQuota` 字段

**检查方法**：
- 点击任意一条记录，查看字段列表
- 如果看到 `dailyDrawQuota` 字段，说明字段已存在
- 如果没有，需要添加字段（见下方说明）

### 1.3 如果字段不存在，添加字段

**方法一：通过更新现有记录添加字段**

1. 在 `static_user_types` 集合中，找到三个用户类型的记录：
   - `typeCode: "guest"`
   - `typeCode: "normal"`
   - `typeCode: "premium"`

2. 对每条记录进行更新：
   - 点击记录，进入编辑模式
   - 添加新字段：`dailyDrawQuota`
   - 根据用户类型设置值：
     - `guest`: `0`
     - `normal`: `3`
     - `premium`: `-1`
   - 保存

**方法二：使用云函数批量更新（推荐）**

创建一个临时的云函数来批量更新数据，或者使用控制台的「数据库操作」功能。

### 1.4 验证数据

**验证步骤**：
1. 查询 `static_user_types` 集合的所有记录
2. 确认三条记录都有 `dailyDrawQuota` 字段
3. 确认值正确：
   - `guest`: `0`
   - `normal`: `3`
   - `premium`: `-1`

**查询示例**（在控制台执行）：
```javascript
// 查询所有用户类型配置
db.collection('static_user_types').get()
```

---

## 任务2：创建 `draw_card_records` 集合

### 2.1 创建集合

**操作步骤**：
1. 在云开发控制台的「数据库」页面
2. 点击「添加集合」按钮
3. 输入集合名称：`draw_card_records`
4. 点击「确定」创建

### 2.2 配置集合权限

**操作步骤**：
1. 点击 `draw_card_records` 集合
2. 点击「权限设置」标签
3. 配置权限：
   - **所有用户可读**：❌ 否（仅创建者可读）
   - **所有用户可写**：❌ 否（仅创建者可写）
   - **仅管理端可读写**：✅ 是（云函数中操作）

**权限说明**：
- 由于抽卡记录包含用户隐私信息（问题、AI解读结果），需要严格控制访问权限
- 云函数默认有管理端权限，可以在云函数中读写数据
- 客户端无法直接访问，确保数据安全

### 2.3 创建索引

#### 2.3.1 创建必须索引：`userId + drawDate` 复合索引

**操作步骤**：
1. 在 `draw_card_records` 集合页面
2. 点击「索引管理」标签
3. 点击「添加索引」按钮
4. 配置索引：
   - **索引名称**：`userId_drawDate`
   - **索引字段**：
     - 字段1：`userId`，排序：`升序`
     - 字段2：`drawDate`，排序：`升序`
   - **索引类型**：`普通索引`
5. 点击「确定」创建

**索引说明**：
- 此索引用于快速查询某用户某天的抽卡记录
- 是配额检查的核心索引，必须创建
- 创建后需要等待几分钟才能生效

#### 2.3.2 创建可选索引：`openid + drawDate` 复合索引（可选）

**操作步骤**：
1. 继续在「索引管理」页面
2. 点击「添加索引」按钮
3. 配置索引：
   - **索引名称**：`openid_drawDate`
   - **索引字段**：
     - 字段1：`openid`，排序：`升序`
     - 字段2：`drawDate`，排序：`升序`
   - **索引类型**：`普通索引`
4. 点击「确定」创建

**索引说明**：
- 此索引用于通过 openid 查询记录（备用）
- 不是必须的，但建议创建以提升查询性能

#### 2.3.3 创建可选索引：`interpretTime` 普通索引（可选）

**操作步骤**：
1. 继续在「索引管理」页面
2. 点击「添加索引」按钮
3. 配置索引：
   - **索引名称**：`interpretTime`
   - **索引字段**：
     - 字段1：`interpretTime`，排序：`降序`
   - **索引类型**：`普通索引`
4. 点击「确定」创建

**索引说明**：
- 此索引用于按时间范围查询记录
- 不是必须的，但如果需要按时间查询历史记录，建议创建

### 2.4 验证集合和索引

**验证步骤**：
1. 确认集合已创建
2. 确认权限配置正确
3. 确认索引已创建（在「索引管理」中查看）
4. 等待索引生效（通常需要几分钟）

**验证查询**（在控制台执行，用于测试）：
```javascript
// 测试查询（此时应该没有数据，但可以验证索引是否生效）
db.collection('draw_card_records')
  .where({
    userId: 'test_user_id',
    drawDate: '2024-01-01',
    isActive: true
  })
  .count()
```

---

## 数据初始化脚本

如果您需要在云函数中批量初始化数据，可以使用以下脚本：

### 初始化 `static_user_types` 表数据

```javascript
// 在云函数中执行，或使用控制台的「数据库操作」功能
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function initUserTypes() {
  const userTypes = [
    {
      typeCode: 'guest',
      typeName: '临时用户',
      displayName: '临时用户',
      description: '未注册的临时用户，功能受限',
      profileQuota: 3,
      permissions: ['view', 'create_limited'],
      dailyDrawQuota: 0  // 新增字段
    },
    {
      typeCode: 'normal',
      typeName: '探索者',
      displayName: '探索者',
      description: '已注册的普通用户，享受基础功能',
      profileQuota: 50,
      permissions: ['view', 'create'],
      dailyDrawQuota: 3  // 新增字段
    },
    {
      typeCode: 'premium',
      typeName: '高级用户',
      displayName: '高级用户',
      description: '付费高级用户，享受全部功能',
      profileQuota: -1,
      permissions: ['all'],
      dailyDrawQuota: -1  // 新增字段
    }
  ];

  for (const userType of userTypes) {
    try {
      // 检查是否已存在
      const existing = await db.collection('static_user_types')
        .where({ typeCode: userType.typeCode })
        .get();
      
      if (existing.data.length > 0) {
        // 更新现有记录，添加 dailyDrawQuota 字段
        await db.collection('static_user_types')
          .doc(existing.data[0]._id)
          .update({
            data: {
              dailyDrawQuota: userType.dailyDrawQuota
            }
          });
        console.log(`已更新用户类型: ${userType.typeCode}`);
      } else {
        // 创建新记录
        await db.collection('static_user_types').add({
          data: userType
        });
        console.log(`已创建用户类型: ${userType.typeCode}`);
      }
    } catch (error) {
      console.error(`处理用户类型 ${userType.typeCode} 失败:`, error);
    }
  }
  
  console.log('用户类型初始化完成');
}

// 执行初始化
initUserTypes();
```

---

## 检查清单

完成以下检查项，确保阶段一任务完成：

### `static_user_types` 表检查
- [ ] 集合 `static_user_types` 存在
- [ ] 包含三条记录（guest, normal, premium）
- [ ] 每条记录都有 `dailyDrawQuota` 字段
- [ ] `guest` 的 `dailyDrawQuota` 值为 `0`
- [ ] `normal` 的 `dailyDrawQuota` 值为 `3`
- [ ] `premium` 的 `dailyDrawQuota` 值为 `-1`

### `draw_card_records` 集合检查
- [ ] 集合 `draw_card_records` 已创建
- [ ] 权限配置正确（仅管理端可读写）
- [ ] `userId + drawDate` 复合索引已创建
- [ ] 索引名称：`userId_drawDate`
- [ ] 索引字段：`userId`（升序）、`drawDate`（升序）
- [ ] 索引状态：已生效（可能需要等待几分钟）

### 可选检查
- [ ] `openid + drawDate` 复合索引已创建（可选）
- [ ] `interpretTime` 普通索引已创建（可选）

---

## 常见问题

### Q1: 如何确认索引是否生效？

**A**: 在「索引管理」页面查看索引状态，显示「已生效」即可。如果显示「创建中」，需要等待几分钟。

### Q2: 如果 `static_user_types` 表不存在怎么办？

**A**: 需要先创建集合，然后使用上面的初始化脚本插入数据。

### Q3: 更新现有记录时，如何批量添加字段？

**A**: 可以使用云函数执行批量更新，或者使用控制台的「数据库操作」功能编写更新脚本。

### Q4: 索引创建失败怎么办？

**A**: 
- 检查字段名是否正确
- 确认集合中已有数据（某些索引需要数据才能创建）
- 等待一段时间后重试
- 如果仍然失败，检查字段类型是否匹配

---

## 下一步

完成阶段一后，请继续执行：
- **阶段二**：云函数开发
- **阶段三**：客户端开发
- **阶段四**：测试验证

---

**完成日期**：_____________  
**执行人**：_____________  
**验证人**：_____________

