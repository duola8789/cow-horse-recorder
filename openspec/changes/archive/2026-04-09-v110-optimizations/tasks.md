# v1.1.0 任务列表

## Tasks

- [x] Task 1: 云函数 getTodayStatus 返回默认时间
- [x] Task 2: 云函数 getMonthlyRecords 时区修复
- [x] Task 3: 云函数 getMonthlyRecords 截止到当天
- [x] Task 4: 云函数 getMonthlyRecords 当天计算时长
- [x] Task 5: 客户端类型定义更新
- [x] Task 6: 打卡页面首屏 Loading
- [x] Task 7: 打卡页面当日工作时长展示

---

## 任务详情

### Task 1: 云函数 getTodayStatus 返回默认时间

**文件:** `cloudfunctions/getTodayStatus/index.ts`

**变更:**

1. 查询 users 表获取用户的 defaultStartTime 和 defaultEndTime
2. 在返回值中添加这两个字段

**返回值变更:**

```typescript
return {
  success: true,
  record,
  isWorkday,
  defaultStartTime, // 新增
  defaultEndTime, // 新增
};
```

---

### Task 2: 云函数 getMonthlyRecords 时区修复

**文件:** `cloudfunctions/getMonthlyRecords/index.ts`

**变更:**
修改 `formatTime` 函数，添加 UTC+8 偏移：

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

---

### Task 3: 云函数 getMonthlyRecords 截止到当天

**文件:** `cloudfunctions/getMonthlyRecords/index.ts`

**变更:**
修改循环条件，只遍历到 min(monthEnd, today)：

```typescript
const displayEnd = monthEnd < today ? monthEnd : today;
while (current <= displayEnd) {
  // ...
}
```

---

### Task 4: 云函数 getMonthlyRecords 当天计算时长

**文件:** `cloudfunctions/getMonthlyRecords/index.ts`

**变更:**
在 `isCurrentToday` 分支中添加时长计算逻辑：

1. 有上班卡，无下班卡：
   - 当前 < 默认下班时间: `now - startTime`
   - 当前 >= 默认下班时间: `defaultEndTime - startTime`
2. 有上班卡，有下班卡: `endTime - startTime`
3. 无上班卡，有下班卡: `endTime - defaultStartTime`

---

### Task 5: 客户端类型定义更新

**文件:** `client/src/services/api.ts`

**变更:**
更新 TodayStatus 接口：

```typescript
export interface TodayStatus {
  record: ClockRecord | null;
  isWorkday: boolean;
  defaultStartTime: string; // 新增
  defaultEndTime: string; // 新增
}
```

---

### Task 6: 打卡页面首屏 Loading

**文件:**

- `client/src/pages/index/index.tsx`
- `client/src/pages/index/index.scss`

**变更:**

1. 添加 `pageLoading` 状态
2. init 函数开始时设置 `pageLoading = true`，结束时设置 `pageLoading = false`
3. 根据 `pageLoading` 状态条件渲染：
   - 始终显示：日期头部、实时时钟
   - pageLoading 时显示 loading spinner
   - 加载完成后显示：切换开关、打卡按钮、状态卡片

**样式:**
添加 `.page-loading` 样式，居中显示 spinner 和文字

---

### Task 7: 打卡页面当日工作时长展示

**文件:**

- `client/src/pages/index/index.tsx`
- `client/src/pages/index/index.scss`

**变更:**

1. 存储 defaultStartTime、defaultEndTime 到状态
2. 添加时长计算函数 `calculateWorkDuration`
3. 添加分钟级 timer 用于更新时长（或复用现有 timer）
4. 添加时长展示组件（位于打卡按钮和状态卡片之间）
5. 无打卡记录时隐藏该组件

**UI 结构:**

```tsx
{
  hasClockRecord && (
    <View className="duration-card">
      <Text className="duration-label">今日已工作</Text>
      <Text className="duration-value">
        <Text className="duration-icon">⏱️</Text>
        {hours} 小时 {minutes} 分
      </Text>
    </View>
  );
}
```

**样式:**

- 卡片背景：淡色渐变
- 时长文字：大号字体（约 48px）
- 标签文字：小号（24px）、灰色
