## Why

系统中所有云函数的日期处理存在结构性 bug：`date` 字段用 `Date` 对象存储，不同云函数使用了不一致的时区转换逻辑（`syncHolidays` 存 UTC 零点，`getToday()` 算出 UTC-8 零点），导致查询失败。具体表现为：工作日被误判为休息日（周一显示休息日）、编辑打卡记录时部分日期无法保存。根因是 `Date` 对象携带时区语义，在 UTC 环境的云函数中极易出错。

## What Changes

- **BREAKING**: `clock_records.date` 字段从 `Date` 对象改为 `string` 格式 `"YYYY-MM-DD"`
- **BREAKING**: `holidays.date` 字段从 `Date` 对象改为 `string` 格式 `"YYYY-MM-DD"`
- 所有云函数引入 `dayjs` + `timezone` 插件，替代手工时区转换逻辑
- 删除所有 `getToday()` 函数及 `BEIJING_OFFSET_MS` 常量，统一使用 `dayjs().tz('Asia/Shanghai').format('YYYY-MM-DD')`
- `startTime` / `endTime` 保持 `Date` 对象不变（记录精确打卡时刻）
- 数据库清空重建（仅有开发者自身数据，无需迁移）

## Capabilities

### New Capabilities

_无新增能力_

### Modified Capabilities

- `stats-api`: 云函数中日期查询方式从 `Date` 范围查询改为字符串比较；工作日判断逻辑重写；时间格式化改用 dayjs

## Impact

- **云函数（全部 6 个）**: `clock`、`getTodayStatus`、`updateRecord`、`getMonthlyRecords`、`getStats`、`syncHolidays` 均需重构日期逻辑
- **依赖**: 每个云函数新增 `dayjs` 依赖
- **数据库**: `clock_records` 和 `holidays` 集合需清空重建
- **客户端**: 无需改动（已使用 dayjs，接收的日期字段本就是字符串）
