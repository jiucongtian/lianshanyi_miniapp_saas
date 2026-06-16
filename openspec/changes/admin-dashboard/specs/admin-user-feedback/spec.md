## ADDED Requirements

### Requirement: 用户管理

后台 SHALL 提供用户列表（按手机号/用户名搜索、分页）与用户类型修改能力，复用现有 `user` 服务。

#### Scenario: 搜索用户

- **WHEN** 管理员输入手机号或用户名关键词并搜索
- **THEN** 系统分页返回匹配用户列表，展示用户类型、注册时间

#### Scenario: 修改用户类型

- **WHEN** 管理员将某用户的 `userType` 修改为 `premium` 并确认
- **THEN** 系统持久化新类型，列表展示更新后的类型标签

### Requirement: 反馈管理

后台 SHALL 提供反馈列表（按状态 `pending`/`reviewed`/全部 过滤、分页）与反馈处理能力，复用现有 `feedback` 服务。

#### Scenario: 按状态筛选反馈

- **WHEN** 管理员选择「待处理」筛选
- **THEN** 系统分页返回状态为 `pending` 的反馈

#### Scenario: 处理反馈

- **WHEN** 管理员将某条反馈标记为已处理
- **THEN** 系统将该反馈状态更新为 `reviewed`，列表实时反映变更
