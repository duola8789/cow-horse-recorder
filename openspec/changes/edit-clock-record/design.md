# 历史打卡记录编辑 - 设计文档

## 1. 系统架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         数据流                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  前端 (stats/index.tsx)              云函数 (updateRecord)          │
│  ┌────────────────────┐             ┌────────────────────┐         │
│  │ 详情弹窗           │             │                    │         │
│  │ ┌────────────────┐ │  ────────▶  │ 1. 参数校验        │         │
│  │ │ 编辑模式       │ │  HTTP       │ 2. 权限校验        │         │
│  │ │ - 时间选择器   │ │             │ 3. 业务校验        │         │
│  │ │ - 状态切换     │ │  ◀────────  │ 4. 更新/创建记录   │         │
│  │ │ - 保存/取消    │ │  Response   │ 5. 返回新数据      │         │
│  │ └────────────────┘ │             │                    │         │
│  └────────────────────┘             └────────────────────┘         │
│           │                                   │                     │
│           ▼                                   ▼                     │
│  ┌────────────────────┐             ┌────────────────────┐         │
│  │ 本地缓存 (dataCache)│             │ 数据库              │         │
│  │ - 清除当月缓存      │             │ clock_records      │         │
│  │ - 重新加载数据      │             │                    │         │
│  └────────────────────┘             └────────────────────┘         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. 云函数设计: updateRecord

### 2.1 接口定义

```typescript
// 请求参数
interface UpdateRecordRequest {
  date: string;              // "2026-04-10" 要编辑的日期 (必填)
  startTime?: string | null; // "09:30" 上班时间 (请假时可为 null)
  endTime?: string | null;   // "18:30" 下班时间 (请假时可为 null)
  status: "normal" | "leave"; // 状态 (必填)
}

// 响应
interface UpdateRecordResponse {
  success: boolean;
  record?: {
    _id: string;
    date: Date;
    startTime: Date | null;
    endTime: Date | null;
    startFrom: "clock" | "default";
    endFrom: "clock" | "default";
    status: "normal" | "leave";
  };
  error?: string;
}
```

### 2.2 校验规则

| 校验项 | 规则 | 错误信息 |
|--------|------|----------|
| date 格式 | 符合 YYYY-MM-DD | "Invalid date format" |
| date 范围 | 当月内 | "Can only edit current month records" |
| date 范围 | 不超过今天 | "Cannot edit future dates" |
| 工作日 | 必须是工作日 | "Cannot edit rest days" |
| status | 必须是 normal 或 leave | "Invalid status" |
| 时间格式 | HH:mm (正常状态下) | "Invalid time format" |
| 时间逻辑 | startTime < endTime (正常状态下) | "Start time must be before end time" |

### 2.3 业务逻辑

```
1. 解析并校验参数
2. 获取用户 openid
3. 校验日期是否在允许范围内
4. 查询该日期是否为工作日 (holidays 表)
5. 查询该日期是否已有记录 (clock_records 表)
   - 有记录: 更新
   - 无记录: 创建
6. 根据 status 处理时间
   - normal: 将 startTime/endTime 字符串转为 Date
   - leave: startTime/endTime 设为 null
7. 设置 startFrom/endFrom 为 "clock" (用户手动编辑视为打卡)
8. 返回更新后的记录
```

---

## 3. 前端设计: 编辑弹窗

### 3.1 UI 状态机

```
┌─────────────────────────────────────────────────────────────────────┐
│                         弹窗状态                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  查看模式 (isEditing = false)          编辑模式 (isEditing = true)  │
│  ┌────────────────────────┐           ┌────────────────────────┐   │
│  │ • 显示当前打卡数据      │           │ • 状态单选框            │   │
│  │ • "编辑"按钮可点击      │  ──────▶  │ • 时间选择器            │   │
│  │                        │  点击编辑  │ • 取消/保存按钮         │   │
│  └────────────────────────┘           └────────────────────────┘   │
│           ▲                                     │                   │
│           │                                     │                   │
│           │              ◀──────────────────────┘                   │
│           │              点击取消 或 保存成功                       │
│                                                                     │
│  保存中 (saving = true)                                             │
│  ┌────────────────────────┐                                        │
│  │ • 按钮显示 loading      │                                        │
│  │ • 禁用所有输入          │                                        │
│  └────────────────────────┘                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 编辑表单状态

```typescript
// 编辑表单状态
interface EditFormState {
  status: "normal" | "leave";  // 状态
  startTime: string;           // "09:30"
  endTime: string;             // "18:30"
}

// 组件状态
const [isEditing, setIsEditing] = useState(false);
const [editForm, setEditForm] = useState<EditFormState | null>(null);
const [saving, setSaving] = useState(false);
```

### 3.3 UI 布局

```
┌─────────────────────────────────────────────────────────────────────┐
│                    编辑弹窗 UI (编辑模式)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────┐                       │
│  │              10日 周五                   │                       │
│  ├─────────────────────────────────────────┤                       │
│  │                                         │                       │
│  │  状态                                   │                       │
│  │  ┌─────────────┐  ┌─────────────┐      │                       │
│  │  │ ○ 正常     │  │ ○ 请假     │      │ ← Radio 单选           │
│  │  └─────────────┘  └─────────────┘      │                       │
│  │                                         │                       │
│  │  ─────────────────────────────────────  │                       │
│  │                                         │                       │
│  │  上班时间                               │                       │
│  │  ┌─────────────────────────────────┐   │                       │
│  │  │          09:30            ▼    │   │ ← Picker 时间选择器    │
│  │  └─────────────────────────────────┘   │                       │
│  │                                         │                       │
│  │  下班时间                               │                       │
│  │  ┌─────────────────────────────────┐   │                       │
│  │  │          18:30            ▼    │   │ ← Picker 时间选择器    │
│  │  └─────────────────────────────────┘   │                       │
│  │                                         │                       │
│  │  ─────────────────────────────────────  │                       │
│  │                                         │                       │
│  │  ┌──────────────┐  ┌──────────────┐   │                       │
│  │  │     取消     │  │     保存     │   │                       │
│  │  └──────────────┘  └──────────────┘   │                       │
│  │                                         │                       │
│  └─────────────────────────────────────────┘                       │
│                                                                     │
│  请假状态时，隐藏时间选择器区域                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.4 交互流程

```
1. 用户点击日期行 → 打开详情弹窗 (查看模式)
2. 用户点击"编辑"按钮 → 切换到编辑模式
   - 初始化 editForm 为当前记录数据
3. 用户修改状态/时间
   - 选择"请假" → 隐藏时间选择器
   - 选择"正常" → 显示时间选择器
4. 用户点击"保存"
   - 前端校验 (startTime < endTime)
   - 调用 updateRecord 云函数
   - 显示 loading
5. 保存成功
   - 关闭弹窗
   - 清除当月缓存 (dataCache.delete(cacheKey))
   - 重新加载数据
6. 保存失败
   - 显示错误提示
   - 保持编辑状态
```

---

## 4. 前端 API 调用

```typescript
// client/src/services/api.ts

export interface UpdateRecordRequest {
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  status: "normal" | "leave";
}

export async function updateRecord(
  data: UpdateRecordRequest
): Promise<{ success: boolean; record?: ClockRecord; error?: string }> {
  const res = await Taro.cloud.callFunction({
    name: "updateRecord",
    data,
  });
  return res.result as { success: boolean; record?: ClockRecord; error?: string };
}
```

---

## 5. 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `cloudfunctions/updateRecord/index.ts` | 新增 | 更新打卡记录云函数 |
| `cloudfunctions/updateRecord/package.json` | 新增 | 云函数依赖配置 |
| `cloudfunctions/updateRecord/tsconfig.json` | 新增 | TypeScript 配置 |
| `client/src/services/api.ts` | 修改 | 添加 updateRecord API |
| `client/src/pages/stats/index.tsx` | 修改 | 添加编辑模式交互逻辑 |
| `client/src/pages/stats/index.scss` | 修改 | 添加编辑表单样式 |

---

## 6. 边界情况处理

| 场景 | 处理方式 |
|------|----------|
| 网络错误 | 显示"保存失败，请重试"，保持编辑状态 |
| 并发编辑 | 后端以最后一次为准，前端刷新显示最新数据 |
| 编辑后切换月份 | 正常切换，下次进入该月份会重新加载 |
| 编辑今天的记录 | 允许，但不影响打卡页面的打卡功能 |
| 时间选择器取消 | 保持原有值不变 |
