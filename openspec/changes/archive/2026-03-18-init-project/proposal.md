# 牛马工时记录器 - 项目初始化

## 概述

一个微信小程序，用于手动记录上下班打卡时间，计算当月工时，防止工时太短被老板找茬。

## 背景

- 无法接入公司打卡系统，需要自己维护数据
- 用户使用微信账号登录，数据隔离
- 第一期功能简单，后续可扩展

## 小程序 AppID

wxf1258d986c7cc72b

## P0 功能

### 小程序页面

1. **首页（打卡页）**
   - 打卡按钮：自动识别上班/下班，可手动切换
   - 多次打卡：上班取最早，下班取最晚
   - 展示今日打卡状态

2. **统计页**
   - 当月工作日总数
   - 已记录天数
   - 总工时、日均工时（T+1，不含当天）

3. **设置页**
   - 默认上班时间
   - 默认下班时间
   - 忘记打卡时使用默认值

### 打卡逻辑

**自动识别规则**

- 上午 (00:00 - 11:59) → 默认展示「上班打卡」按钮
- 下午 (12:00 - 23:59) → 默认展示「下班打卡」按钮

**手动切换**

- 用户可以切换打卡类型
- 异常操作需二次确认：
  - 上午打下班卡 → "现在是上午，确认打下班卡吗？"
  - 没打上班卡直接打下班卡 → "将使用默认上班时间 09:30"

**多次打卡**

- 上班卡：取当天最早时间
- 下班卡：取当天最晚时间

**缺卡填充**

- 统计时发现某天缺上班卡 → 用默认时间 (09:30) 填充
- 统计时发现某天缺下班卡 → 用默认时间 (18:30) 填充

### 后端功能

- 用户登录（微信登录）
- 打卡记录存储
- 月度统计计算
- 节假日数据管理（每年 12 月 31 日从 API 同步）

## 后续功能（非 P0）

- 请假功能（按钮、状态、统计时排除）
- 手动修改历史打卡记录
- 日统计信息
- 压力时间、早鸟时间等统计
- 数据导出
- 请假天数统计

## 技术选型

### 前端

| 项目   | 选型                            | 说明                       |
| ------ | ------------------------------- | -------------------------- |
| 框架   | Taro 3.x + React 18             | 熟悉 React，开发体验好     |
| 语言   | TypeScript                      | 类型安全                   |
| UI 库  | NutUI (@nutui/nutui-react-taro) | 京东出品，与 Taro 兼容性好 |
| 工具库 | dayjs                           | 轻量日期处理               |

### 后端

| 项目   | 选型         | 说明               |
| ------ | ------------ | ------------------ |
| 平台   | 微信云开发   | 免运维，登录零成本 |
| 云函数 | TypeScript   | 与前端统一         |
| 数据库 | 微信云数据库 | 文档型，自带       |

### 工程化

| 项目      | 选型                 | 说明                  |
| --------- | -------------------- | --------------------- |
| ESLint    | @antfu/eslint-config | 零配置，内置 Prettier |
| Git Hooks | husky + lint-staged  | 提交前检查            |
| 包管理    | npm                  | 简单，云函数兼容性好  |

## 数据库设计

### users (用户表)

```typescript
interface User {
  _id: string;
  _openid: string; // 微信 openid
  defaultStartTime: string; // 默认上班时间 "09:30"
  defaultEndTime: string; // 默认下班时间 "18:30"
  createdAt: Date;
  updatedAt: Date;
}
```

### clock_records (打卡记录)

```typescript
interface ClockRecord {
  _id: string;
  _openid: string;
  date: Date; // 当天 00:00:00
  startTime: Date | null; // 上班时间
  endTime: Date | null; // 下班时间
  startFrom: "clock" | "default";
  endFrom: "clock" | "default";
  status: "normal" | "leave"; // 正常 | 请假（P0 只用 normal，预留字段）
  createdAt: Date;
  updatedAt: Date;
}
// 索引: { _openid: 1, date: 1 } unique
```

### holidays (节假日)

```typescript
interface Holiday {
  _id: string;
  date: Date; // 当天 00:00:00
  year: number;
  type: "workday" | "holiday";
  name?: string; // 节假日名称
}
// 索引: { date: 1 } unique
```

## 云函数设计

| 函数名         | 功能       | 输入                                   | 输出                                                        |
| -------------- | ---------- | -------------------------------------- | ----------------------------------------------------------- |
| login          | 登录/注册  | -                                      | { user }                                                    |
| clock          | 打卡       | { type: 'start' \| 'end' }             | { record }                                                  |
| getStats       | 月度统计   | { year, month }                        | { totalWorkDays, recordedDays, totalHours, avgHoursPerDay } |
| getTodayStatus | 今日状态   | -                                      | { record, isWorkday }                                       |
| updateSettings | 更新设置   | { defaultStartTime?, defaultEndTime? } | { user }                                                    |
| syncHolidays   | 同步节假日 | { year }                               | { count }                                                   |

## 项目结构

```
cow-horse-recorder/
├── client/                    # Taro 小程序
│   ├── src/
│   │   ├── pages/
│   │   │   ├── index/         # 打卡页
│   │   │   ├── stats/         # 统计页
│   │   │   └── settings/      # 设置页
│   │   ├── components/
│   │   ├── services/          # 云函数调用封装
│   │   ├── utils/
│   │   └── app.tsx
│   ├── package.json
│   └── tsconfig.json
├── cloud/                     # 云函数
│   └── functions/
│       ├── login/
│       ├── clock/
│       ├── getStats/
│       ├── getTodayStatus/
│       ├── updateSettings/
│       └── syncHolidays/
├── .husky/
├── eslint.config.js
├── package.json               # 根目录，管理 husky/lint-staged
└── project.config.json
```

## 外部依赖

- **节假日 API**: http://timor.tech/api/holiday/
  - 每年 12 月 31 日同步下年数据到数据库
  - 运行时查数据库，不依赖外部接口

## 后续迭代 (非 P0)

- [ ] 手动修改历史打卡记录
- [ ] 日统计信息
- [ ] 压力时间、早鸟时间等统计
- [ ] 数据导出

## 决策记录

| 决策        | 选项                             | 结论                 | 原因                                                  |
| ----------- | -------------------------------- | -------------------- | ----------------------------------------------------- |
| 后端方案    | 传统后端 vs 微信云开发           | 微信云开发           | 免运维，登录零成本，功能简单够用                      |
| 前端框架    | 原生 vs Taro                     | Taro                 | 熟悉 React，开发体验好                                |
| UI 库       | NutUI vs Taro UI vs Taroify      | NutUI                | 京东出品，与 Taro 兼容性好，组件质量高                |
| 时间存储    | string vs Date                   | Date                 | 便于筛选比较，前端用 dayjs 处理                       |
| ESLint 配置 | @antfu/eslint-config vs 传统配置 | @antfu/eslint-config | 零配置，内置 Prettier                                 |
| 包管理      | pnpm vs npm                      | npm                  | 简单，云函数各自独立安装依赖，pnpm workspace 优势不大 |
| 打卡识别    | 按时间段 vs 按状态               | 按时间段             | 上午默认上班卡，下午默认下班卡，符合直觉              |
| 默认时间    | 09:00/18:00 vs 09:30/18:30       | 09:30/18:30          | 用户需求                                              |
