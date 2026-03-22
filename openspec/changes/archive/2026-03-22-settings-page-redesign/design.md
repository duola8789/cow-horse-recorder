## Context

当前设置页面使用 taro-ui 的 AtList/AtListItem 组件，样式与首页、统计页的自定义渐变风格不一致。需要完全重写为自定义组件，保持全应用视觉统一。

**现有设计系统（从其他页面提取）：**
- 背景：`linear-gradient(180deg, #f8f9ff 0%, #ffffff 100%)`
- 卡片圆角：`24px`
- 卡片阴影：`0 4px 16px rgba(0, 0, 0, 0.06)`
- 内部元素圆角：`16px`
- 主色渐变：`#667eea → #764ba2`（紫色）

## Goals / Non-Goals

**Goals:**
- 设置页 UI 风格与首页、统计页完全一致
- 移除 taro-ui 依赖，使用自定义组件
- 新增打卡提醒设置区域（UI 占位）
- 新增关于区域（版本号 + slogan）

**Non-Goals:**
- 不实现真正的提醒功能（订阅消息）
- 不新增后端 API
- 不修改现有的时间设置逻辑

## Decisions

### 1. 页面结构：三个卡片区块

```
┌─────────────────────────────────────┐
│  ⏰ 默认时间设置                     │  ← Section Card 1
│  ├─ 上班时间 (Picker)               │
│  └─ 下班时间 (Picker)               │
├─────────────────────────────────────┤
│  🔔 打卡提醒                         │  ← Section Card 2
│  ├─ 上班提醒 → "即将上线"           │
│  └─ 下班提醒 → "即将上线"           │
├─────────────────────────────────────┤
│  ℹ️ 关于                             │  ← Section Card 3
│  ├─ 版本号 v1.0.0                   │
│  └─ 🐮🐴 slogan                     │
└─────────────────────────────────────┘
```

**理由：** 卡片化布局与统计页一致，每个区块职责清晰。

### 2. 组件结构：可复用的 SettingItem 模式

```tsx
// 列表项结构
<View className="setting-item" onClick={...}>
  <Text className="item-icon">{icon}</Text>
  <Text className="item-label">{label}</Text>
  <Text className="item-value">{value}</Text>
  <Text className="item-arrow">›</Text>
</View>
```

**理由：** 统一的列表项样式，便于后续扩展更多设置项。

### 3. 时间选择器：保持现有 Picker 逻辑

继续使用 `@tarojs/components` 的 `Picker` 组件包裹列表项，点击触发选择器。这与现有实现一致，只改变外观。

### 4. 版本号来源：硬编码

直接在代码中写死 `v1.0.0`，与 `package.json` 保持一致即可。

**理由：** 小程序不方便动态读取 package.json，且版本更新不频繁。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| 提醒功能长期显示"即将上线"可能让用户困惑 | 可以改为"敬请期待"或添加小字说明 |
| 移除 taro-ui 后其他地方是否还在用 | 经检查，AtList/AtListItem 仅在设置页使用 |
