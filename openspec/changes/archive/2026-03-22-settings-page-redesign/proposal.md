## Why

设置页面当前使用 taro-ui 组件，风格与首页、统计页不一致（缺少渐变背景、圆角偏小、无自定义组件样式）。需要重设计以保持 UI 一致性，并添加提醒设置占位和版本信息展示。

## What Changes

- 移除 taro-ui 依赖（AtList/AtListItem），改用自定义组件
- 统一视觉风格：渐变背景、24px 圆角卡片、统一阴影
- 新增「打卡提醒」设置区域（UI 占位，显示"即将上线"）
- 新增「关于」区域：版本号 + slogan

## Capabilities

### New Capabilities

- `settings-ui`: 设置页面的 UI 组件和样式，包含默认时间、提醒设置、关于信息三个区块

### Modified Capabilities

<!-- 无需修改现有 specs，时间设置功能保持不变 -->

## Impact

- `client/src/pages/settings/index.tsx` - 完全重写
- `client/src/pages/settings/index.scss` - 完全重写
- 移除对 taro-ui 的 AtList/AtListItem 依赖（仅在设置页使用）
