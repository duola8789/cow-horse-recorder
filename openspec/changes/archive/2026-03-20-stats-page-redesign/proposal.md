## Why

当前统计页面 UX 设计存在严重问题：字体小、统计数据单一（只有4个汇总数字）、无法查看每日具体数据、无法切换月份。用户最常需要的是快速查看当月日均工时，以及追溯某天的具体工时情况，但现有设计完全无法满足这些需求。

## What Changes

- 重新设计统计页面，采用三级钻取结构：月度概览 → 每日列表 → 单日详情
- 日均工时作为核心指标突出显示，总工时降级为辅助信息
- 新增月份切换功能，支持查看历史月份数据
- 新增每日明细列表，展示每天的工时、上下班时间、打卡状态
- 新增单日详情弹窗，展示当天详细的打卡记录与默认时间对比
- 新增状态标识系统：区分实际打卡、使用默认、漏打卡、休息日、请假等状态
- 新增后端接口 `getMonthlyRecords`，返回月度每日明细数据
- 预留编辑/补录入口（下版本实现）

## Capabilities

### New Capabilities
- `stats-monthly-view`: 月度统计概览，包含日均工时核心指标、工作日/已记录天数、总工时，支持月份切换
- `stats-daily-list`: 每日明细列表，展示当月每天的工时数据和打卡状态，支持展开/收起
- `stats-daily-detail`: 单日详情弹窗，展示具体上下班时间、打卡来源（打卡/默认）、工作时长
- `stats-api`: 后端接口，提供月度每日明细数据，包含状态标识和汇总统计

### Modified Capabilities
<!-- 无现有 spec 需要修改 -->

## Impact

- **前端代码**: `client/src/pages/stats/` 页面完全重写
- **后端代码**: 新增 `cloudfunctions/getMonthlyRecords/` 云函数
- **API 接口**: 新增 `getMonthlyRecords(year, month)` 接口，原有 `getStats` 保持兼容
- **数据类型**: 新增 `DailyRecord`、`MonthlyRecordsResponse` 类型定义
