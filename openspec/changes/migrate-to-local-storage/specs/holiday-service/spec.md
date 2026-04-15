## ADDED Requirements

### Requirement: 节假日初始化
系统 SHALL 在应用启动时初始化节假日数据。

#### Scenario: 首次启动初始化当年数据
- **WHEN** 应用首次启动且无节假日数据
- **THEN** 系统尝试同步当年节假日数据

#### Scenario: 12月自动拉取次年数据
- **WHEN** 当前月份是12月且没有次年节假日数据
- **THEN** 系统自动调用 API 拉取次年节假日数据

#### Scenario: 非12月不拉取次年数据
- **WHEN** 当前月份不是12月
- **THEN** 系统不请求次年节假日数据

#### Scenario: 已有次年数据不重复拉取
- **WHEN** 12月启动但已有次年数据
- **THEN** 系统跳过 API 请求

### Requirement: 节假日同步
系统 SHALL 从第三方 API 同步指定年份的节假日数据。

#### Scenario: API 同步成功
- **WHEN** 调用节假日 API 且返回成功
- **THEN** 系统解析数据并存储到 Storage

#### Scenario: API 同步失败
- **WHEN** 调用节假日 API 失败（网络错误、超时、限流）
- **THEN** 系统记录警告日志但不影响应用启动

#### Scenario: API 数据格式错误
- **WHEN** API 返回的数据格式不符合预期
- **THEN** 系统记录错误日志并跳过存储

### Requirement: 工作日判断
系统 SHALL 提供判断指定日期是否为工作日的方法。

#### Scenario: 有节假日数据时精确判断
- **WHEN** Storage 中有该年份的节假日数据
- **THEN** 根据节假日数据精确判断是否为工作日

#### Scenario: 无节假日数据时降级判断
- **WHEN** Storage 中没有该年份的节假日数据
- **THEN** 使用默认规则（周一到周五为工作日）

#### Scenario: 法定节假日判断
- **WHEN** 日期被标记为 'holiday'
- **THEN** 返回 false（不是工作日）

#### Scenario: 调休工作日判断
- **WHEN** 日期被标记为 'workday'
- **THEN** 返回 true（是工作日）

### Requirement: 节假日数据存储
节假日数据 SHALL 按年份分组存储，包含版本和更新时间。

#### Scenario: 按年份存储
- **WHEN** 存储节假日数据
- **THEN** 数据按年份组织，每年一个独立的数据块

#### Scenario: 包含元信息
- **WHEN** 存储节假日数据
- **THEN** 包含 version（年份）、updateTime（更新时间）、data（日期映射）
