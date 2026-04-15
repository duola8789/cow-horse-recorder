## ADDED Requirements

### Requirement: 打卡功能
系统 SHALL 提供上班和下班打卡功能，记录打卡时间。

#### Scenario: 上班打卡
- **WHEN** 用户执行上班打卡
- **THEN** 系统记录当前时间为 startTime，startFrom 标记为 'clock'

#### Scenario: 下班打卡
- **WHEN** 用户执行下班打卡
- **THEN** 系统记录当前时间为 endTime，endFrom 标记为 'clock'

#### Scenario: 多次上班打卡取最早时间
- **WHEN** 用户当天多次上班打卡
- **THEN** 系统保留最早的上班时间

#### Scenario: 多次下班打卡取最晚时间
- **WHEN** 用户当天多次下班打卡
- **THEN** 系统保留最晚的下班时间

### Requirement: 获取今日打卡记录
系统 SHALL 提供获取今日打卡记录的方法。

#### Scenario: 今日有打卡记录
- **WHEN** 查询今日打卡记录且记录存在
- **THEN** 返回包含 startTime、endTime 等信息的记录

#### Scenario: 今日无打卡记录
- **WHEN** 查询今日打卡记录且记录不存在
- **THEN** 返回 null

### Requirement: 更新打卡记录
系统 SHALL 支持手动编辑历史打卡记录。

#### Scenario: 更新现有记录
- **WHEN** 更新指定日期的打卡记录
- **THEN** 系统更新该日期的记录并标记 updatedAt

#### Scenario: 创建新记录
- **WHEN** 更新不存在的日期记录
- **THEN** 系统创建新记录

### Requirement: 获取月度打卡记录
系统 SHALL 提供按月查询打卡记录的方法。

#### Scenario: 查询指定月份记录
- **WHEN** 查询指定年月的打卡记录
- **THEN** 返回该月所有打卡记录的 Map 对象

#### Scenario: 月份无记录
- **WHEN** 查询的月份没有任何打卡记录
- **THEN** 返回空 Map 对象

### Requirement: 数据持久化
所有打卡操作 SHALL 立即持久化到 Storage。

#### Scenario: 打卡后数据持久化
- **WHEN** 完成打卡操作
- **THEN** 数据立即写入 Storage，重启应用后数据依然存在
