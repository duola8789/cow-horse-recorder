## 1. 依赖安装

- [x] 1.1 为所有 6 个云函数安装 dayjs 依赖（`npm i dayjs`）：clock、getTodayStatus、updateRecord、getMonthlyRecords、getStats、syncHolidays

## 2. syncHolidays 重构

- [x] 2.1 重构 `syncHolidays/index.ts`：引入 dayjs 初始化，将 `holidays.date` 从 `new Date(year, month-1, day)` 改为字符串 `"YYYY-MM-DD"`（用 dayjs 格式化），移除 Date 对象存储

## 3. clock 重构

- [x] 3.1 重构 `clock/index.ts`：引入 dayjs 初始化，用 `dayjs().tz('Asia/Shanghai').format('YYYY-MM-DD')` 替代 `getToday()`，`clock_records.date` 改为字符串存储，查询改为字符串精确匹配

## 4. getTodayStatus 重构

- [x] 4.1 重构 `getTodayStatus/index.ts`：引入 dayjs 初始化，用 dayjs 获取今天日期字符串，holidays 查询改为字符串精确匹配，`isWeekend` 改用 `dayjs(dateStr).day()`

## 5. updateRecord 重构

- [x] 5.1 重构 `updateRecord/index.ts`：引入 dayjs 初始化，`parseDateString` 直接返回字符串，holidays 和 clock_records 查询改为字符串匹配，`isWeekend` 改用 dayjs，`parseTimeString` 改用 dayjs 构造时间

## 6. getMonthlyRecords 重构

- [x] 6.1 重构 `getMonthlyRecords/index.ts`：引入 dayjs 初始化，月份范围构造改为字符串（`"2026-04-01"` ~ `"2026-04-30"`），日期遍历改用 dayjs 循环，`formatTime` 改用 `dayjs(date).tz('Asia/Shanghai').format('HH:mm')`，holidayMap/recordMap 的 key 直接用日期字符串，`isWeekend` 改用 dayjs，删除所有 `BEIJING_OFFSET_MS`、`getToday()`、`formatDateKey()`、手工时区转换代码

## 7. getStats 重构

- [x] 7.1 重构 `getStats/index.ts`：引入 dayjs 初始化，月份范围和日期遍历改用 dayjs 字符串，holidayMap/recordMap 的 key 改用日期字符串，`isWeekend` 改用 dayjs，删除所有手工时区转换代码

## 8. 构建与验证

- [x] 8.1 运行所有云函数的 TypeScript 编译（`npm run build:cloud`），确保无类型错误
- [x] 8.2 清空线上数据库 `clock_records` 和 `holidays` 集合
- [x] 8.3 部署所有云函数到线上环境
- [x] 8.4 手动触发 `syncHolidays({ year: 2026 })` 同步节假日数据
- [x] 8.5 验证：今天（工作日）不再显示为休息日
- [x] 8.6 验证：打卡后 clock_records.date 存储为字符串 `"YYYY-MM-DD"`
- [x] 8.7 验证：编辑任意工作日的打卡记录可正常保存
