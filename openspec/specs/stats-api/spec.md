## MODIFIED Requirements

### Requirement: 获取月度每日明细接口

系统 SHALL 提供本地 `StatsService.getMonthlyRecords()` 方法，返回指定月份的每日工时明细和汇总统计。所有日期字段 SHALL 使用字符串格式 `"YYYY-MM-DD"` 存储和查询，所有时区相关计算 SHALL 使用 dayjs + utcOffset(8) 基于北京时间。

#### Scenario: 请求当月数据

- **WHEN** 客户端调用 `StatsService.getMonthlyRecords(2026, 4)`
- **THEN** 系统从 Storage 读取打卡记录，使用字符串前缀匹配 `"2026-04"` 筛选数据，返回 2026年4月的每日明细和汇总统计

#### Scenario: 请求历史月份数据

- **WHEN** 客户端调用 `StatsService.getMonthlyRecords(2025, 12)`
- **THEN** 系统返回 2025年12月的完整月度数据

### Requirement: 计算每日状态

系统 SHALL 根据打卡记录、节假日、请假等信息计算每日状态。工作日判断 SHALL 调用 HolidayService.isWorkday() 方法。

#### Scenario: 判定为 recorded 状态

- **WHEN** 工作日且上下班都有打卡记录
- **THEN** 系统设置 status 为 "recorded"

#### Scenario: 判定为 partial 状态

- **WHEN** 工作日且只有部分打卡记录（上班或下班之一）
- **THEN** 系统设置 status 为 "partial"

#### Scenario: 判定为 default 状态

- **WHEN** 工作日且无打卡记录但可使用默认时间
- **THEN** 系统设置 status 为 "default"

#### Scenario: 判定为 rest 状态

- **WHEN** 某日通过 HolidayService.isWorkday() 判断为非工作日
- **THEN** 系统设置 status 为 "rest"

#### Scenario: 判定为 leave 状态

- **WHEN** 某日打卡记录标记为请假
- **THEN** 系统设置 status 为 "leave"

#### Scenario: 判定为 today 状态

- **WHEN** 某日是今天（通过 `dayjs().format('YYYY-MM-DD')` 判断）
- **THEN** 系统设置 status 为 "today"，isToday 为 true

### Requirement: 返回汇总统计

系统 SHALL 在响应中包含月度汇总统计，调用 StatsService.getMonthStats() 方法。

#### Scenario: 返回汇总数据

- **WHEN** 系统返回月度数据
- **THEN** 响应包含 summary 对象，包含 totalWorkDays, recordedDays, totalHours, avgHoursPerDay

## REMOVED Requirements

### Requirement: 云函数调用
**Reason**: 迁移到本地化架构，不再使用云函数
**Migration**: 使用 `StatsService.getMonthlyRecords()` 替代 `wx.cloud.callFunction({ name: 'getMonthlyRecords' })`
