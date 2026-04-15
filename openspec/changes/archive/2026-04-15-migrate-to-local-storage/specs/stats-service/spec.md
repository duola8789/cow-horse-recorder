## ADDED Requirements

### Requirement: 月度统计计算
系统 SHALL 提供月度工时统计功能，计算总工作日、已打卡天数、总工时、日均工时。

#### Scenario: 计算当月统计
- **WHEN** 查询指定年月的统计数据
- **THEN** 返回包含 totalWorkDays、recordedDays、totalHours、avgHoursPerDay 的统计对象

#### Scenario: 实时统计规则
- **WHEN** 查询统计数据
- **THEN** 统计包含今天，实时计算当日工时

#### Scenario: 未来月份统计
- **WHEN** 查询未来月份的统计
- **THEN** 返回全部为 0 的空统计对象

### Requirement: 工作日计算
系统 SHALL 根据节假日数据计算工作日列表。

#### Scenario: 普通工作日
- **WHEN** 日期是周一到周五且不是节假日
- **THEN** 该日期被认定为工作日

#### Scenario: 周末
- **WHEN** 日期是周六或周日且没有调休标记
- **THEN** 该日期不是工作日

#### Scenario: 法定节假日
- **WHEN** 日期被标记为 holiday
- **THEN** 该日期不是工作日

#### Scenario: 调休工作日
- **WHEN** 周末日期被标记为 workday
- **THEN** 该日期是工作日

### Requirement: 工时计算
系统 SHALL 计算每个工作日的工时，支持打卡时间和默认时间。

#### Scenario: 使用打卡时间
- **WHEN** 该日有打卡记录
- **THEN** 使用打卡的 startTime 和 endTime 计算工时

#### Scenario: 使用默认时间
- **WHEN** 该日无打卡记录
- **THEN** 使用用户设置的 defaultStartTime 和 defaultEndTime 计算工时

#### Scenario: 部分打卡
- **WHEN** 该日只有 startTime 或只有 endTime
- **THEN** 缺失的时间使用默认时间，并计入 recordedDays

#### Scenario: 请假日不计入
- **WHEN** 该日状态为 leave
- **THEN** 该日不计入工时统计

### Requirement: 统计性能
统计计算 SHALL 在客户端本地完成，响应时间 MUST 小于 100ms。

#### Scenario: 本地计算性能
- **WHEN** 计算一个月（约20个工作日）的统计
- **THEN** 计算完成时间小于 100ms
