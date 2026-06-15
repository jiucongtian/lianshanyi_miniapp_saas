## ADDED Requirements

### Requirement: 对外生辰八字计算接口

系统 SHALL 经对外门面提供 `POST /openapi/v1/bazi/calculate`，要求平台类 scope `bazi:calculate`（无状态、无需绑定上下文），复用共享业务能力中的八字计算逻辑，MUST NOT 重复实现八字算法。

#### Scenario: 公历日期计算成功

- **WHEN** 携带合法签名与 scope 的请求提交有效公历 `year/month/day/hour`
- **THEN** 系统返回四柱（年/月/日/时，含天干地支与五行）、五行统计等结构化结果，`success=true`

#### Scenario: 农历日期计算成功

- **WHEN** 请求设置 `isLunar=true` 并提交支持范围（1900–2100）内的农历日期
- **THEN** 系统先转换为公历再计算，返回结构化八字结果

### Requirement: 入参校验

接口 SHALL 在调用业务逻辑前用 schema 校验入参，非法入参 MUST 快速失败并返回 `VALIDATION_ERROR`。

#### Scenario: 缺失必填字段

- **WHEN** 请求缺少 `year`/`month`/`day`/`hour` 等必填字段或类型不合法
- **THEN** 系统返回 400 与错误码 `VALIDATION_ERROR`，不调用计算逻辑

#### Scenario: 农历超出支持范围

- **WHEN** `isLunar=true` 且日期超出 1900–2100 支持范围
- **THEN** 系统返回 400 与错误码 `VALIDATION_ERROR`（或 `BAZI_OUT_OF_RANGE`），消息可读

### Requirement: 稳定的对外输出结构

对外八字结果结构 SHALL 与内部实现解耦，使用明确的对外字段命名（如 `yearPillar.stem/branch/stemWuXing/branchWuXing`），默认 MUST NOT 透传内部 `raw` 原始结构。

#### Scenario: 默认不返回内部 raw

- **WHEN** 普通调用未显式请求原始数据
- **THEN** 响应中不包含内部 `raw` 字段，仅返回稳定的对外字段
