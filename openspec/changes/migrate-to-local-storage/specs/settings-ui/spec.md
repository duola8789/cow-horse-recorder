## MODIFIED Requirements

### Requirement: 默认时间设置

默认时间设置区块 SHALL 包含上班时间和下班时间两个可点击的设置项。点击后 SHALL 弹出时间选择器，选择后 SHALL 保存到本地 Storage。

#### Scenario: 修改默认上班时间

- **WHEN** 用户点击「默认上班时间」项
- **THEN** 弹出时间选择器，显示 00:00-23:30 每 30 分钟一个选项
- **WHEN** 用户选择新时间并确认
- **THEN** 调用 Storage.set('user_settings', newSettings) 保存到本地，设置项显示新时间，并提示「保存成功」

#### Scenario: 修改默认下班时间

- **WHEN** 用户点击「默认下班时间」项
- **THEN** 弹出时间选择器
- **WHEN** 用户选择新时间并确认
- **THEN** 调用 Storage.set('user_settings', newSettings) 保存到本地，设置项显示新时间，并提示「保存成功」

## REMOVED Requirements

### Requirement: 云函数保存设置
**Reason**: 迁移到本地化架构，不再使用云函数
**Migration**: 使用 `Storage.set('user_settings', settings)` 替代 `wx.cloud.callFunction({ name: 'updateSettings' })`
