## MODIFIED Requirements

### Requirement: 获取月度每日明细接口

系统 SHALL 提供 `getMonthlyRecords` 云函数接口，返回指定月份的每日工时明细和汇总统计。所有日期字段 SHALL 使用字符串格式 `"YYYY-MM-DD"` 存储和查询，所有时区相关计算 SHALL 使用 dayjs + timezone 插件基于 `Asia/Shanghai` 时区。

#### Scenario: 请求当月数据

- **WHEN** 客户端调用 `getMonthlyRecords(2026, 4)`
- **THEN** 系统使用 `dayjs().tz('Asia/Shanghai')` 获取当前北京日期，使用字符串范围查询 `date >= "2026-04-01" AND date <= "2026-04-30"` 获取数据，返回 2026年4月的每日明细和汇总统计

#### Scenario: 请求历史月份数据

- **WHEN** 客户端调用 `getMonthlyRecords(2025, 12)`
- **THEN** 系统返回 2025年12月的完整月度数据

### Requirement: 计算每日状态

系统 SHALL 根据打卡记录、节假日、请假等信息计算每日状态。工作日判断 SHALL 使用 `dayjs(dateStr).day()` 计算周几，holidays 集合查询 SHALL 使用字符串精确匹配。

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

- **WHEN** 某日是周末或节假日（通过 `dayjs(dateStr).day()` 判断周末，holidays 集合中 type 为 "holiday" 判断节假日）
- **THEN** 系统设置 status 为 "rest"

#### Scenario: 判定为 leave 状态

- **WHEN** 某日打卡记录标记为请假
- **THEN** 系统设置 status 为 "leave"

#### Scenario: 判定为 today 状态

- **WHEN** 某日是今天（通过 `dayjs().tz('Asia/Shanghai').format('YYYY-MM-DD')` 判断）
- **THEN** 系统设置 status 为 "today"，isToday 为 true

### Requirement: 计算每日工时

系统 SHALL 根据上下班时间计算每日工时。`startTime` / `endTime` 的时间格式化 SHALL 使用 `dayjs(date).tz('Asia/Shanghai').format('HH:mm')`。

#### Scenario: 使用打卡时间计算

- **WHEN** 存在打卡记录的上下班时间
- **THEN** 系统使用打卡时间计算工时，精确到分钟

#### Scenario: 使用默认时间计算

- **WHEN** 没有打卡记录但有默认时间设置
- **THEN** 系统使用默认时间计算工时

#### Scenario: 无法计算工时

- **WHEN** 缺少必要的时间信息
- **THEN** 系统返回 hours 和 minutes 为 null

### Requirement: 返回汇总统计

系统 SHALL 在响应中包含月度汇总统计，复用 getStats 的计算逻辑。

#### Scenario: 返回汇总数据

- **WHEN** 系统返回月度数据
- **THEN** 响应包含 summary 对象，包含 totalWorkDays, recordedDays, totalHours, avgHoursPerDay
