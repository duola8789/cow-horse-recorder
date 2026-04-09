# v1.1.0 设计文档

## 1. 首页冷启动 Loading

### 现状

```tsx
// 当前：只有 loading 状态用于打卡按钮
const [loading, setLoading] = useState(false);
```

### 设计

添加 `pageLoading` 状态，控制首屏数据加载状态：

```
┌─────────────────────────────────────────────────┐
│              2026年4月9日 周四                   │
│                 [工作日]                         │
│                                                 │
│              19:03:49                           │  ◀─ 时钟始终显示
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  │           ⏳ 加载中...                   │   │  ◀─ pageLoading 时
│  │                                         │   │     显示 loading
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

**状态变化：**

- `pageLoading = true`: 显示 loading spinner，隐藏打卡按钮/状态卡片
- `pageLoading = false`: 正常显示所有内容

---

## 2. 打卡页面 - 当日工作时长

### UI 设计

```
┌─────────────────────────────────────────────────┐
│        ┌───────────────────────┐               │
│        │       😊             │               │
│        │     下班打卡          │               │
│        └───────────────────────┘               │
│                                                 │
│  ╔═════════════════════════════════════════╗   │
│  ║           今日已工作                     ║   │
│  ║                                         ║   │
│  ║     ⏱️  9 小时 53 分                    ║   │
│  ╚═════════════════════════════════════════╝   │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐           │
│  │ 😢 上班      │  │ 😊 下班      │           │
│  │   08:56     │  │   --:--      │           │
│  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────┘
```

**样式设计：**

- 卡片式设计，与状态卡片风格统一
- 淡色渐变背景（根据上班/下班状态变化）
- 时长使用大号字体突出显示
- 无打卡记录时隐藏整个区域

### 时长计算逻辑

需要获取用户的默认上下班时间，通过 `getTodayStatus` 接口返回。

```typescript
interface TodayStatus {
  record: ClockRecord | null;
  isWorkday: boolean;
  defaultStartTime: string; // 新增: "09:30"
  defaultEndTime: string; // 新增: "18:30"
}
```

**计算规则：**

| 场景                                | startTime        | endTime        | 计算方式                     |
| ----------------------------------- | ---------------- | -------------- | ---------------------------- |
| 有上班卡，无下班卡，当前 < 默认下班 | record.startTime | now            | `now - startTime`            |
| 有上班卡，无下班卡，当前 ≥ 默认下班 | record.startTime | defaultEndTime | `defaultEndTime - startTime` |
| 有上班卡，有下班卡                  | record.startTime | record.endTime | `endTime - startTime`        |
| 无上班卡，有下班卡                  | defaultStartTime | record.endTime | `endTime - defaultStartTime` |
| 无任何打卡                          | —                | —              | 不显示                       |

**更新机制：**

- 每分钟更新一次（复用现有 `currentTime` 的 timer，改为分钟级）
- 或者新建一个独立的分钟级 timer

---

## 3. 统计页面 - 时区修复

### 问题分析

```
数据库存储: 2026-04-09T00:51:00.000Z (UTC)
           = 2026-04-09 08:51 北京时间

云函数 formatTime:
  new Date(date).getHours() → 0 (UTC 小时)
  返回 "00:51" ✗ 错误
```

### 修复方案

在云函数中手动加 8 小时偏移：

```typescript
function formatTime(date: Date | null): string | null {
  if (!date) return null;
  const d = new Date(date);
  // UTC+8 偏移
  const utc8 = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  const hours = String(utc8.getUTCHours()).padStart(2, "0");
  const minutes = String(utc8.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}
```

**影响范围：**

- `getMonthlyRecords` 云函数
- 返回的 `startTime`、`endTime` 字段

---

## 4. 统计页面 - 只展示到当天

### 现状

```typescript
const monthEnd = new Date(year, month, 0); // 月末
while (current <= monthEnd) { ... }
```

### 修复方案

```typescript
const monthEnd = new Date(year, month, 0);
const today = getToday();
const displayEnd = monthEnd < today ? monthEnd : today; // min(monthEnd, today)

while (current <= displayEnd) { ... }
```

---

## 5. 统计页面 - 当天计算时长

### 现状

```typescript
if (isCurrentToday) {
  status = "today";
  // 只取 startTime, endTime，未计算 hours/minutes
}
```

### 修复方案

当天也需要计算工作时长，逻辑与打卡页面一致：

```typescript
if (isCurrentToday) {
  status = "today";
  // ... 获取 startTime, endTime

  // 新增：计算当天时长
  const now = new Date();
  const defaultEnd = parseTimeToDate(defaultEndTime, current);

  if (clockRecord?.startTime) {
    const actualStart = new Date(clockRecord.startTime);
    let actualEnd: Date;

    if (clockRecord.endTime) {
      // 有下班卡
      actualEnd = new Date(clockRecord.endTime);
    } else if (now < defaultEnd) {
      // 无下班卡，当前时间未超过默认下班时间
      actualEnd = now;
    } else {
      // 无下班卡，当前时间已超过默认下班时间
      actualEnd = defaultEnd;
    }

    const mins = diffMinutes(actualStart, actualEnd);
    if (mins > 0) {
      minutes = mins;
      hours = Math.round((mins / 60) * 100) / 100;
    }
  } else if (clockRecord?.endTime) {
    // 无上班卡，有下班卡
    const actualStart = parseTimeToDate(defaultStartTime, current);
    const actualEnd = new Date(clockRecord.endTime);
    const mins = diffMinutes(actualStart, actualEnd);
    if (mins > 0) {
      minutes = mins;
      hours = Math.round((mins / 60) * 100) / 100;
    }
  }
}
```

---

## 文件变更清单

| 文件                                        | 变更类型 | 说明                                  |
| ------------------------------------------- | -------- | ------------------------------------- |
| `client/src/pages/index/index.tsx`          | 修改     | 添加 pageLoading 状态、时长展示组件   |
| `client/src/pages/index/index.scss`         | 修改     | 添加 loading 和时长卡片样式           |
| `cloudfunctions/getTodayStatus/index.ts`    | 修改     | 返回 defaultStartTime、defaultEndTime |
| `cloudfunctions/getMonthlyRecords/index.ts` | 修改     | 时区修复、截止到当天、当天计算时长    |
| `client/src/services/api.ts`                | 修改     | TodayStatus 类型添加字段              |
