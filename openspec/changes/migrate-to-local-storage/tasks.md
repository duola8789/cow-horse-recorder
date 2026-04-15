## 1. 基础设施搭建

- [x] 1.1 创建 `client/src/constants/storage.ts` 定义 Storage key 常量
- [x] 1.2 创建 `client/src/types/data.ts` 定义数据类型（ClockRecord、UserSettings、HolidaysCache）
- [x] 1.3 创建 `client/src/utils/storage.ts` 实现 Storage 封装类（get、set、remove 方法）
- [x] 1.4 在 `client/src/app.tsx` 中添加数据初始化逻辑（onLaunch 时初始化默认数据）

## 2. 节假日服务

- [x] 2.1 创建 `client/src/services/holidayService.ts` 基础框架
- [x] 2.2 实现 `HolidayService.init()` 方法（应用启动时初始化）
- [x] 2.3 实现 `HolidayService.syncYear()` 方法（从 API 同步节假日）
- [x] 2.4 实现 `HolidayService.isWorkday()` 方法（判断工作日，支持降级）
- [x] 2.5 实现 `HolidayService.getHolidayType()` 方法（获取节假日类型）
- [x] 2.6 在 `client/src/app.tsx` 的 onLaunch 中调用 `HolidayService.init()`

## 3. 打卡服务

- [x] 3.1 创建 `client/src/services/clockService.ts` 基础框架
- [x] 3.2 实现 `ClockService.clock()` 方法（上班/下班打卡，支持多次打卡）
- [x] 3.3 实现 `ClockService.getTodayRecord()` 方法（获取今日记录）
- [x] 3.4 实现 `ClockService.updateRecord()` 方法（更新/创建记录）
- [x] 3.5 实现 `ClockService.getMonthRecords()` 方法（获取月度记录）
- [x] 3.6 实现 `ClockService.createEmptyRecord()` 私有方法（创建空记录）

## 4. 统计服务

- [x] 4.1 创建 `client/src/services/statsService.ts` 基础框架
- [x] 4.2 实现 `StatsService.getMonthStats()` 方法（月度统计计算）
- [x] 4.3 实现 `StatsService.calculateWorkdays()` 方法（计算工作日列表）
- [x] 4.4 实现 `StatsService.calcMinutes()` 方法（计算分钟数）
- [x] 4.5 实现 `StatsService.getMonthlyRecords()` 方法（获取月度每日明细）
- [x] 4.6 实现每日状态计算逻辑（recorded、partial、default、rest、leave、today）

## 5. 打卡页面改造

- [x] 5.1 修改 `client/src/pages/index/index.tsx`，移除云函数调用
- [x] 5.2 替换打卡逻辑为 `ClockService.clock(type)`
- [x] 5.3 替换今日状态查询为 `ClockService.getTodayRecord()`
- [x] 5.4 测试打卡功能（上班、下班、多次打卡）

## 6. 统计页面改造

- [x] 6.1 修改 `client/src/pages/stats/index.tsx`，移除云函数调用
- [x] 6.2 替换月度统计为 `StatsService.getMonthStats()`
- [x] 6.3 替换每日明细为 `StatsService.getMonthlyRecords()`
- [x] 6.4 确保实时统计规则正确（包含今天，实时计算当日工时）
- [x] 6.5 测试统计功能（当月、历史月份、跨年）

## 7. 设置页面改造

- [x] 7.1 修改 `client/src/pages/settings/index.tsx`，移除云函数调用
- [x] 7.2 替换设置读取为 `Storage.get('user_settings')`
- [x] 7.3 替换设置保存为 `Storage.set('user_settings', newSettings)`
- [x] 7.4 测试设置功能（修改默认时间、刷新后保持）

## 8. 清理云开发相关代码

- [x] 8.1 删除 `cloudfunctions/` 整个目录
- [x] 8.2 修改 `client/src/app.config.ts`，移除 `cloud: true` 配置
- [x] 8.3 修改 `client/src/app.tsx`，移除 `wx.cloud.init()` 调用
- [x] 8.4 删除 `client/src/pages/poc-test/` 测试页面目录
- [x] 8.5 从 `client/src/app.config.ts` 中移除 poc-test 页面路由
- [x] 8.6 检查并删除其他云开发相关代码（如 `client/src/services/api.ts` 中的云函数调用）

## 9. 配置和优化

- [x] 9.1 在微信公众平台配置 request 合法域名：`https://timor.tech`
- [x] 9.2 修改所有 `dayjs.tz('Asia/Shanghai')` 为 `dayjs.utcOffset(8)` 避免 iOS 警告
- [x] 9.3 确保所有 Storage 操作都有 try-catch 错误处理
- [x] 9.4 添加必要的 console.log 用于调试（可在发布前删除）

## 10. 完整测试

- [x] 10.1 测试首次启动（数据初始化、节假日同步）
- [x] 10.2 测试打卡流程（上班、下班、编辑记录）
- [x] 10.3 测试统计功能（当月、历史、跨月）
- [x] 10.4 测试设置功能（修改默认时间）
- [x] 10.5 测试工作日判断（普通工作日、周末、节假日、调休）
- [x] 10.6 测试 12 月启动（自动拉取次年节假日）
- [x] 10.7 测试节假日 API 失败场景（降级到默认规则）
- [x] 10.8 测试数据持久化（重启应用后数据依然存在）
- [x] 10.9 真机测试（iOS 和 Android）
- [x] 10.10 性能测试（统计计算时间 < 100ms）

## 11. 发布准备

- [x] 11.1 删除所有调试日志
- [x] 11.2 更新版本号（package.json → 2.0.0）
- [ ] 11.3 创建 git tag：`git tag v1.1.4-before-migration`
- [ ] 11.4 提交代码：`git commit -m "feat: migrate to local storage"`
- [ ] 11.5 推送到远程：`git push && git push --tags`
- [ ] 11.6 构建生产版本
- [ ] 11.7 小程序后台提交审核
