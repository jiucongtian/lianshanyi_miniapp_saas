## ADDED Requirements

### Requirement: OpenAPI 调用日志查询

后台 SHALL 提供 OpenAPI 调用日志（`open-api-log`）查询，支持按 App ID、时间范围、接口路径、状态码过滤与分页。

#### Scenario: 按 App ID 过滤日志

- **WHEN** 管理员输入某 App ID 并选择时间范围查询
- **THEN** 系统分页返回该凭据在时间范围内的调用日志，含路径、状态码、耗时、时间戳

### Requirement: 用量统计

后台 SHALL 提供按凭据/接口/时间维度的用量统计（调用次数、成功率、平均耗时）。

#### Scenario: 查看凭据用量概览

- **WHEN** 管理员打开数据看板并选择某凭据
- **THEN** 系统返回该凭据的调用总量、成功率与平均耗时指标

### Requirement: 运营数据看板

后台 SHALL 提供运营数据看板，汇总抽卡记录与每日愈见生成情况等关键运营指标。

#### Scenario: 查看运营概览

- **WHEN** 管理员打开数据看板首页
- **THEN** 系统返回近段时间的抽卡次数、每日愈见生成数等汇总指标
