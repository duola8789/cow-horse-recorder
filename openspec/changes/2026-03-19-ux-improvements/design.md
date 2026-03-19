# 技术设计 - UX 优化与完善

## Context

基于 proposal.md 中的需求，本文档详细设计登录流程、节假日同步、首页 UI 三个模块的技术实现。

**当前状态**：
- 登录：在 index 页面 init() 中调用，每次 useDidShow 都会触发
- 节假日：syncHolidays 云函数存在，但无触发机制
- 首页：基础 UI 已实现，但交互和视觉效果不佳

## Goals / Non-Goals

**Goals:**
- 实现一次登录，全局可用
- 建立可靠的节假日数据同步机制
- 打造美观、易用的打卡首页

**Non-Goals:**
- 复杂的状态管理库（不用 Redux/MobX/Zustand）
- 自定义节假日（使用公共 API 数据）
- 动画特效（保持简洁）

## Decisions

### 1. 全局状态管理：使用 Taro.getApp().globalData

```typescript
// app.tsx
class App extends Component {
  globalData = {
    isLoggedIn: false,
    user: null as User | null,
    loginPromise: null as Promise<void> | null,
  }

  onLaunch() {
    this.globalData.loginPromise = this.doLogin()
  }

  async doLogin() {
    const result = await login()
    this.globalData.isLoggedIn = true
    this.globalData.user = result.user
  }
}
```

**理由**：
- Taro 原生支持，无需额外依赖
- 小程序生命周期内持久化
- 简单场景足够用

**页面使用方式**：
```typescript
// 任意页面
const app = Taro.getApp()
await app.globalData.loginPromise // 等待登录完成
const user = app.globalData.user
```

### 2. 节假日同步：定时触发器 + login 兜底

```
┌─────────────────────────────────────────────────────────────────┐
│                      节假日同步时序图                            │
└─────────────────────────────────────────────────────────────────┘

  常规路径 (每年执行)
  ═══════════════════

  12月31日 00:00
       │
       ▼
  ┌─────────────────┐     ┌─────────────────┐
  │ 定时触发器触发   │────▶│ syncHolidays    │
  │                 │     │ (year: 下一年)   │
  └─────────────────┘     └────────┬────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │ 写入 holidays   │
                          │ 集合            │
                          └─────────────────┘


  兜底路径 (首次上线/数据丢失)
  ═══════════════════════════

  用户打开小程序
       │
       ▼
  ┌─────────────────┐
  │ login 云函数    │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────────────────┐
  │ 查询 holidays               │
  │ where: { year: 当年 }       │
  │ limit: 1                    │
  └────────────┬────────────────┘
               │
       ┌───────┴───────┐
       ▼               ▼
  ┌─────────┐    ┌──────────────────┐
  │ 有数据   │    │ 无数据            │
  │ → 跳过   │    │ → 调用 syncHolidays│
  └─────────┘    └──────────────────┘
```

**config.json 配置**：
```json
{
  "triggers": [{
    "name": "syncNextYear",
    "type": "timer",
    "config": "0 0 0 31 12 * *"
  }]
}
```

**login 云函数修改**：
```typescript
// 在返回用户信息前检查节假日数据
const currentYear = new Date().getFullYear()
const holidayCheck = await db.collection('holidays')
  .where({ year: currentYear })
  .limit(1)
  .get()

if (holidayCheck.data.length === 0) {
  // 异步触发同步，不阻塞登录
  cloud.callFunction({
    name: 'syncHolidays',
    data: { year: currentYear }
  }).catch(console.error)
}
```

### 3. 首页组件结构

```
┌─────────────────────────────────────────────────────────────────┐
│                        组件树                                    │
└─────────────────────────────────────────────────────────────────┘

  Index (pages/index/index.tsx)
  │
  ├── DateHeader (日期 + 工作日状态)
  │   ├── 日期文本: "2026年3月19日 周四"
  │   └── 状态标签: [工作日] / [休息日]
  │
  ├── RealTimeClock (实时时钟)
  │   └── 时间文本: "14:26:18" (每秒更新)
  │
  ├── ClockTypeSwitch (上下班切换)
  │   └── 自定义 Switch 组件
  │
  ├── ClockButton (打卡按钮)
  │   ├── 渐变背景圆形
  │   ├── 图标 (☀️/🌅)
  │   └── 文字 (上班打卡/下班打卡)
  │
  └── StatusCard (打卡状态卡片)
      ├── 上班状态
      │   ├── 图标 ☀️
      │   ├── 时间
      │   └── 状态文字
      └── 下班状态
          ├── 图标 🌙
          ├── 时间
          └── 状态文字
```

### 4. 实时时钟实现

```typescript
const [currentTime, setCurrentTime] = useState(new Date())

useEffect(() => {
  const timer = setInterval(() => {
    setCurrentTime(new Date())
  }, 1000)

  return () => clearInterval(timer)
}, [])

// 格式化显示
const timeStr = dayjs(currentTime).format('HH:mm:ss')
```

**性能考虑**：
- 只更新时钟组件，避免整页重渲染
- 使用 `React.memo` 包装其他组件

### 5. Switch 组件设计

由于 VantUI 的 Switch 样式可能不符合需求，使用自定义实现：

```typescript
interface ClockTypeSwitchProps {
  value: 'start' | 'end'
  onChange: (value: 'start' | 'end') => void
}

function ClockTypeSwitch({ value, onChange }: ClockTypeSwitchProps) {
  return (
    <View className="clock-type-switch">
      <Text
        className={`switch-option ${value === 'start' ? 'active' : ''}`}
        onClick={() => onChange('start')}
      >
        上班
      </Text>
      <View className="switch-track">
        <View className={`switch-thumb ${value}`} />
      </View>
      <Text
        className={`switch-option ${value === 'end' ? 'active' : ''}`}
        onClick={() => onChange('end')}
      >
        下班
      </Text>
    </View>
  )
}
```

### 6. 打卡按钮渐变实现

微信小程序 CSS 支持 `linear-gradient`：

```scss
.clock-button {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  
  &.start-mode {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
  
  &.end-mode {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  }
}
```

### 7. 震动反馈

```typescript
const handleClock = async () => {
  // 先震动反馈
  Taro.vibrateShort({ type: 'medium' })
  
  // 再执行打卡
  await doClockIn(clockType)
}
```

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `client/src/app.tsx` | 修改 | 添加全局登录逻辑 |
| `client/src/services/api.ts` | 修改 | 调整 login 调用方式 |
| `client/src/pages/index/index.tsx` | 重写 | 新 UI 实现 |
| `client/src/pages/index/index.scss` | 重写 | 新样式实现 |
| `client/src/utils/date.ts` | 修改 | 添加日期格式化函数 |
| `cloudfunctions/login/index.ts` | 修改 | 添加节假日检测 |
| `cloudfunctions/syncHolidays/config.json` | 新增 | 定时触发器配置 |

## Risks / Trade-offs

| 决策 | Trade-off |
|------|-----------|
| globalData 而非状态库 | 简单但扩展性有限，大型应用需迁移 |
| login 中异步触发 syncHolidays | 不阻塞登录，但首次打开时节假日可能还没同步完 |
| 自定义 Switch | 更灵活但需要维护更多代码 |
| 每秒更新时钟 | 轻微性能开销，但用户体验更好 |
