# Tasks - UX 优化与完善

## Overview

基于 proposal.md 和 design.md，将工作拆分为以下任务。

---

## Task 1: 全局登录状态管理 ✅

**目标**: 在 app.tsx 中实现一次登录，全局可用

**文件变更**:
- `client/src/app.tsx`

**实现步骤**:
1. 修改 App 组件为 class 组件（如果需要使用 globalData）
2. 添加 globalData 定义：isLoggedIn, user, loginPromise
3. 在 onLaunch 中调用 login 并存储 Promise
4. 导出 globalData 类型定义

**验收标准**:
- [x] App 启动时自动执行登录
- [x] globalData.loginPromise 可在任意页面 await
- [x] globalData.user 登录后可获取用户信息

---

## Task 2: 页面登录状态适配 ✅

**目标**: 各页面使用全局登录状态，移除重复登录调用

**文件变更**:
- `client/src/pages/index/index.tsx`
- `client/src/pages/stats/index.tsx`
- `client/src/pages/settings/index.tsx`

**实现步骤**:
1. 移除 index 页面的 login() 调用
2. 使用 Taro.getApp().globalData.loginPromise 等待登录
3. 其他页面添加相同的登录等待逻辑

**验收标准**:
- [x] index 页面不再直接调用 login()
- [x] 页面加载时等待全局登录完成后再获取数据

---

## Task 3: 节假日定时触发器配置 ✅

**目标**: 配置 syncHolidays 云函数的定时触发器

**文件变更**:
- `cloudfunctions/syncHolidays/config.json` (新增)
- `cloudfunctions/syncHolidays/index.ts` (修改，处理定时触发)

**实现步骤**:
1. 创建 config.json，配置 cron 表达式 `0 0 0 31 12 * *`
2. 修改 index.ts，当 event.year 未传入时自动使用下一年

**验收标准**:
- [x] config.json 格式正确
- [x] 云函数可以处理定时触发（无 year 参数时使用 nextYear）

---

## Task 4: login 云函数添加节假日检测 ✅

**目标**: 首次使用时自动触发节假日同步

**文件变更**:
- `cloudfunctions/login/index.ts`

**实现步骤**:
1. 在返回用户信息前，查询当年 holidays 数据
2. 如果不存在，异步调用 syncHolidays
3. 不阻塞登录流程

**验收标准**:
- [x] 首次登录时检测 holidays 集合
- [x] 无数据时触发 syncHolidays
- [x] 登录响应时间不受影响

---

## Task 5: 首页日期和时钟显示 ✅

**目标**: 添加日期显示、工作日标签、实时时钟

**文件变更**:
- `client/src/pages/index/index.tsx`
- `client/src/pages/index/index.scss`
- `client/src/utils/date.ts`

**实现步骤**:
1. 在 date.ts 添加日期格式化函数（年月日、星期）
2. 添加实时时钟 state 和 useEffect 定时器
3. 渲染日期、工作日标签、实时时钟

**验收标准**:
- [x] 显示格式："2026年3月19日 周四"
- [x] 工作日显示蓝色标签，休息日显示橙色标签
- [x] 时钟每秒更新

---

## Task 6: Switch 切换组件 ✅

**目标**: 实现上班/下班模式切换

**文件变更**:
- `client/src/pages/index/index.tsx`
- `client/src/pages/index/index.scss`

**实现步骤**:
1. 实现 ClockTypeSwitch 组件
2. 添加滑动动画效果
3. 点击切换 clockType state

**验收标准**:
- [x] 点击"上班"/"下班"文字可切换
- [x] 滑块有平滑过渡动画
- [x] 切换后打卡按钮样式同步变化

---

## Task 7: 渐变打卡按钮 ✅

**目标**: 实现大圆形渐变打卡按钮

**文件变更**:
- `client/src/pages/index/index.tsx`
- `client/src/pages/index/index.scss`

**实现步骤**:
1. 移除 VantUI Button，使用自定义 View
2. 实现 180px 圆形按钮
3. 根据 clockType 切换渐变色
4. 添加图标和文字

**配色**:
- 上班：`linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- 下班：`linear-gradient(135deg, #f093fb 0%, #f5576c 100%)`

**验收标准**:
- [x] 按钮为 180px 圆形
- [x] 渐变色正确显示
- [x] 包含图标和"上班打卡"/"下班打卡"文字

---

## Task 8: 打卡状态卡片 ✅

**目标**: 优化底部打卡状态展示

**文件变更**:
- `client/src/pages/index/index.tsx`
- `client/src/pages/index/index.scss`

**实现步骤**:
1. 重构状态卡片布局
2. 添加图标 ☀️/🌙
3. 已打卡显示时间 + ✓
4. 未打卡显示 --:-- + 灰色文字

**验收标准**:
- [x] 左右两栏分别显示上班/下班状态
- [x] 图标和颜色区分明确
- [x] 已打卡/未打卡状态清晰

---

## Task 9: 打卡交互优化 ✅

**目标**: 添加震动反馈和异常确认

**文件变更**:
- `client/src/pages/index/index.tsx`

**实现步骤**:
1. 打卡时添加 Taro.vibrateShort()
2. 保留异常情况确认对话框
3. 打卡成功后更新状态

**验收标准**:
- [x] 点击打卡按钮有震动反馈
- [x] 上午打下班卡弹出确认
- [x] 未打上班卡直接打下班卡弹出确认

---

## Task 10: 样式整合与测试 ✅

**目标**: 整合所有样式，确保视觉一致性

**文件变更**:
- `client/src/pages/index/index.scss`
- `client/src/app.scss` (如需全局样式)

**实现步骤**:
1. 整理所有样式代码
2. 确保响应式适配
3. 测试真机效果

**验收标准**:
- [x] 不同尺寸屏幕显示正常
- [x] 无样式冲突
- [x] 视觉效果符合设计稿

---

## 任务依赖关系

```
Task 1 (全局登录) ──┬──▶ Task 2 (页面适配)
                   │
Task 3 (定时触发) ──┼──▶ Task 4 (login检测)
                   │
Task 5 (日期时钟) ──┼──▶ Task 6 (Switch) ──┬──▶ Task 10 (整合)
                   │                      │
Task 7 (打卡按钮) ──┼──▶ Task 8 (状态卡片)──┤
                   │                      │
Task 9 (交互优化) ──┴────────────────────────┘
```

## 预估工时

| Task | 预估时间 | 状态 |
|------|----------|------|
| Task 1-2 | 30 分钟 | ✅ 完成 |
| Task 3-4 | 30 分钟 | ✅ 完成 |
| Task 5-9 | 2 小时 | ✅ 完成 |
| Task 10 | 30 分钟 | ✅ 完成 |
| **总计** | **3.5 小时** | **全部完成** |
