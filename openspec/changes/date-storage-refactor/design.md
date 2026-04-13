## Context

牛马工时记录器是一个微信小程序 + 云开发项目。当前所有云函数中的日期处理使用 `Date` 对象存储"日期"概念（如 `clock_records.date`、`holidays.date`），并通过手工计算 `BEIJING_OFFSET_MS` 进行时区转换。由于云函数运行在 UTC 环境，而 `syncHolidays` 和 `getToday()` 使用了不一致的转换逻辑，导致数据库中存储的时间戳不匹配、`isWeekend()` 判断基于 UTC 的周几而非北京时间的周几。

当前数据库存储现状（以 2026-04-13 为例）：
- `syncHolidays` 存入：`new Date(2026, 3, 13)` → `2026-04-13T00:00:00Z`（UTC 零点）
- `getToday()` 计算：`Date.UTC(y,m,d) - 8h` → `2026-04-12T16:00:00Z`（UTC-8 零点）
- 精确查询 `WHERE date = today` 永远匹配不上

约束：
- 仅一个用户（开发者自己），数据可清空重建
- 客户端已使用 dayjs，无需改动
- 每个云函数有独立的 `package.json`，需各自安装依赖

## Goals / Non-Goals

**Goals:**
- 彻底消除所有云函数中的时区 bug
- 统一日期存储格式为字符串 `"YYYY-MM-DD"`
- 引入 dayjs 替代所有手工时区计算
- 修复工作日判断错误（周一显示休息日）
- 修复编辑打卡记录时部分日期无法保存

**Non-Goals:**
- 不改变客户端代码（客户端已正确处理）
- 不改变 `startTime` / `endTime` 的存储格式（保持 `Date` 对象）
- 不做数据迁移（清空重建）
- 不改变云函数的 API 接口契约（入参出参结构不变）

## Decisions

### 决策 1：日期字段存储格式 — 字符串 `"YYYY-MM-DD"`

**选择**: 字符串

**备选方案**:
- A) 时间戳 (number) — 不解决时区问题，且可读性差
- B) Date 对象 (UTC 零点) — 修复 getToday() 即可，但仍有时区心智负担
- C) 字符串 `"YYYY-MM-DD"` — 无时区语义，完全消除问题

**理由**: 字符串没有时区概念，不可能再出时区 bug。微信云数据库支持字符串的字典序范围查询（`_.gte("2026-04-01").and(_.lte("2026-04-30"))` ），查询能力不受影响。调试时数据库中一眼可读。

### 决策 2：计算库 — dayjs + utc + timezone 插件

**选择**: dayjs

**理由**: 客户端已使用 dayjs（`"^1.11.20"`），前后端统一工具链。dayjs 核心 + 插件约 5KB（gzip），对云函数无负担。`dayjs().tz('Asia/Shanghai').format('YYYY-MM-DD')` 一行代码替代原来 10+ 行的手工时区计算。

需要的插件：
- `dayjs/plugin/utc` — UTC 模式支持
- `dayjs/plugin/timezone` — 时区转换

### 决策 3：dayjs 初始化模式 — 每个云函数顶部统一初始化

每个云函数文件顶部统一添加：
```typescript
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
dayjs.extend(utc);
dayjs.extend(timezone);
```

### 决策 4：时间格式化方案

`startTime` / `endTime` 仍为 `Date` 对象（UTC 时间戳），展示时用 dayjs 转换：
```typescript
dayjs(startTime).tz('Asia/Shanghai').format('HH:mm')
```

替代原来的手工 `+8h` 再 `getUTCHours()` 逻辑。

### 决策 5：isWeekend 判断方式

```typescript
dayjs(dateStr).day() // dateStr = "2026-04-13" → 1 (周一)
```

`dayjs("YYYY-MM-DD").day()` 基于日期字符串计算周几，无时区歧义。替代原来对 `Date` 对象调用 `.getDay()` 的方式。

## Risks / Trade-offs

- **[风险] 每个云函数需单独安装 dayjs** → 通过构建脚本或手动 `npm install` 解决，一次性成本
- **[风险] 清空数据库后需重新同步节假日** → 部署后立即手动触发 `syncHolidays({ year: 2026 })`
- **[风险] 字符串查询性能是否足够** → 数据量极小（单用户），无性能瓶颈；字典序比较在小数据集上高效
- **[取舍] 放弃 Date 对象的原生排序能力** → 字符串 `"YYYY-MM-DD"` 字典序等同于时间序，无影响
