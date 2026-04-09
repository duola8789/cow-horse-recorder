# 技术设计 - 牛马工时记录器

## Context

初始化一个微信小程序项目，用于记录上下班打卡时间和计算月度工时。

**当前状态**：空项目，需要从零搭建。

**约束**：

- 使用微信云开发，不需要独立服务器
- 用户数据隔离，每人只能看自己的数据
- 需要处理节假日/工作日判断

## Goals / Non-Goals

**Goals:**

- 搭建可运行的 Taro + 微信云开发项目骨架
- 实现 P0 功能：打卡、月统计、设置
- 建立代码规范和开发流程

**Non-Goals:**

- 请假功能（预留字段，后续实现）
- 历史数据修改
- 多端支持（仅微信小程序）

## Decisions

### 1. 项目结构：client + cloudfunctions 分离

```
cow-horse-recorder/
├── client/           # Taro 小程序
├── cloudfunctions/   # 云函数（微信开发者工具识别）
└── scripts/          # 构建脚本
```

**理由**：微信云开发的标准结构，开发者工具能正确识别。

**备选方案**：

- monorepo with shared types → 云函数独立部署，共享 types 意义有限

### 2. 云函数：TypeScript 开发，编译为 JavaScript 部署

```
cloudfunctions/
├── login/
│   ├── index.ts        # 源码（TypeScript）
│   ├── index.js        # 编译产物（自动生成）
│   ├── package.json
│   └── tsconfig.json
├── clock/
│   └── ...
```

**工作流**：

1. 使用 TypeScript 编写云函数（index.ts）
2. 运行 `npm run build:cloud` 编译为 JavaScript（index.js）
3. 通过微信开发者工具部署编译后的 JS 文件

**理由**：

- TypeScript 提供类型安全，减少运行时错误
- 微信云函数运行时只支持 JavaScript
- tsconfig.json 配置 `outDir: "."` 使编译产物与源码同目录
- 微信云函数部署机制要求每个函数有独立的 node_modules

### 3. 时间处理：服务端用 Date，前端用 dayjs

```typescript
// 云函数
// 小程序
import dayjs from "dayjs";

const record = { startTime: new Date() };
dayjs(record.startTime).format("HH:mm");
```

**理由**：

- 数据库原生支持 Date，查询比较方便
- dayjs 轻量（2KB），满足格式化需求

**备选方案**：

- 全用 timestamp (number) → 可读性差
- 全用 string → 比较麻烦

### 4. 状态管理：不用 Redux/MobX

**理由**：

- 只有 3 个页面，状态简单
- Taro 的 `useDidShow` + 云函数调用足够
- 避免过度设计

**如果后续需要**：考虑 zustand（轻量）

### 5. 打卡记录：按天存储，非按事件存储

```typescript
// 采用：一天一条记录
{ date, startTime, endTime, ... }

// 不采用：每次打卡一条
{ timestamp, type: 'start' | 'end' }
```

**理由**：

- 查询月统计只需查 30 条，不用聚合
- 多次打卡逻辑在 clock 云函数中处理

### 6. 节假日数据：定时同步到数据库

```
┌─────────────┐    每年12月31日     ┌─────────────┐
│ timor.tech  │ ──────────────────► │  holidays   │
│    API      │   syncHolidays()    │   集合      │
└─────────────┘                     └─────────────┘
                                           │
                                           ▼
                                    运行时直接查库
```

**理由**：

- 避免运行时依赖外部 API
- API 挂了不影响用户使用

### 7. 缺卡填充时机：统计时填充，不写入数据库

```typescript
// getStats 云函数
records.map((r) => ({
  startTime: r.startTime ?? parseTime(user.defaultStartTime),
  endTime: r.endTime ?? parseTime(user.defaultEndTime),
}));
```

**理由**：

- 保持原始数据真实性
- 用户修改默认时间后，统计结果会自动更新

## Risks / Trade-offs

| 风险                  | 影响                | 缓解措施                   |
| --------------------- | ------------------- | -------------------------- |
| 云函数冷启动慢        | 首次请求 1-3 秒延迟 | 可接受，打卡场景不敏感     |
| timor.tech API 不稳定 | 年底同步失败        | 手动触发重试 / 多源备份    |
| 云数据库查询语法特殊  | 学习成本            | 参考官方文档，封装常用操作 |
| NutUI 组件样式覆盖    | 定制麻烦            | P0 阶段使用默认样式        |

## 接口设计

### clock 云函数核心逻辑

```typescript
async function clock(type: "start" | "end") {
  const today = startOfDay(new Date());
  const now = new Date();

  // 查询今日记录
  let record = await db
    .collection("clock_records")
    .where({ _openid, date: today })
    .get();

  if (!record) {
    // 创建新记录
    record = { date: today, startTime: null, endTime: null, status: "normal" };
  }

  if (type === "start") {
    // 取更早的时间
    record.startTime = record.startTime ? min(record.startTime, now) : now;
    record.startFrom = "clock";
  } else {
    // 取更晚的时间
    record.endTime = record.endTime ? max(record.endTime, now) : now;
    record.endFrom = "clock";
  }

  // upsert
  await db.collection("clock_records").doc(record._id).set(record);
  return record;
}
```

### getStats 云函数核心逻辑

```typescript
async function getStats(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // 月末
  const today = startOfDay(new Date());

  // 获取工作日列表（排除今天，T+1）
  const workdays = await getWorkdays(startDate, min(endDate, yesterday(today)));

  // 获取打卡记录
  const records = await db
    .collection("clock_records")
    .where({ _openid, date: _.gte(startDate).and(_.lt(today)) })
    .get();

  // 计算工时（缺卡用默认值填充）
  const user = await getUser();
  let totalMinutes = 0;

  for (const day of workdays) {
    const record = records.find((r) => isSameDay(r.date, day));
    const start = record?.startTime ?? parseTime(user.defaultStartTime, day);
    const end = record?.endTime ?? parseTime(user.defaultEndTime, day);
    totalMinutes += diffMinutes(end, start);
  }

  return {
    totalWorkDays: workdays.length,
    recordedDays: records.length,
    totalHours: totalMinutes / 60,
    avgHoursPerDay: totalMinutes / 60 / workdays.length,
  };
}
```

## 数据库索引

| 集合          | 索引                      | 类型   |
| ------------- | ------------------------- | ------ |
| clock_records | `{ _openid: 1, date: 1 }` | unique |
| holidays      | `{ date: 1 }`             | unique |
| holidays      | `{ year: 1 }`             | normal |
