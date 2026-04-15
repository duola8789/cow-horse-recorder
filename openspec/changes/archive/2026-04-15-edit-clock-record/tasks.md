# 历史打卡记录编辑 - 任务清单

## 任务列表

### Phase 1: 云函数开发

- [x] **Task 1.1**: 创建 updateRecord 云函数骨架
  - 创建 `cloudfunctions/updateRecord/` 目录
  - 添加 `package.json` (参考其他云函数)
  - 添加 `tsconfig.json` (参考其他云函数)
  - 创建 `index.ts` 基础结构

- [x] **Task 1.2**: 实现参数校验逻辑
  - date 格式校验 (YYYY-MM-DD)
  - status 枚举校验 (normal | leave)
  - 时间格式校验 (HH:mm)
  - 时间逻辑校验 (startTime < endTime)

- [x] **Task 1.3**: 实现业务逻辑
  - 校验日期范围 (当月、不超过今天)
  - 查询工作日/休息日
  - 查询现有记录 (更新 vs 创建)
  - 处理 normal/leave 状态的时间
  - 更新/创建数据库记录
  - 返回更新后的记录

- [x] **Task 1.4**: 编译并测试云函数
  - 运行 `npm run build`
  - 通过开发者工具部署
  - 使用调试面板测试各种场景

### Phase 2: 前端 API 层

- [x] **Task 2.1**: 添加 API 类型定义和调用方法
  - 在 `client/src/services/api.ts` 添加:
    - `UpdateRecordRequest` 接口
    - `updateRecord()` 函数

### Phase 3: 前端 UI 开发

- [x] **Task 3.1**: 添加编辑模式状态管理
  - 添加 `isEditing` 状态
  - 添加 `editForm` 状态 (status, startTime, endTime)
  - 添加 `saving` 状态
  - 实现 `enterEditMode()` 函数
  - 实现 `exitEditMode()` 函数

- [x] **Task 3.2**: 实现编辑表单 UI
  - 状态单选框 (正常/请假)
  - 时间选择器 (上班/下班)
  - 请假时隐藏时间选择器
  - 取消/保存按钮

- [x] **Task 3.3**: 实现保存逻辑
  - 前端校验
  - 调用 updateRecord API
  - 处理成功/失败
  - 清除缓存并刷新列表

- [x] **Task 3.4**: 添加编辑表单样式
  - 状态选择器样式
  - 时间选择器样式
  - 按钮样式
  - loading 状态样式

### Phase 4: 测试 & 收尾

- [x] **Task 4.1**: 端到端测试
  - 测试正常状态编辑
  - 测试请假状态切换
  - 测试时间校验
  - 测试网络错误处理
  - 测试编辑今天的记录

- [x] **Task 4.2**: 代码提交
  - 代码 review
  - 提交 commit

---

## 依赖关系

```
Task 1.1 ──▶ Task 1.2 ──▶ Task 1.3 ──▶ Task 1.4
                                          │
                                          ▼
                                      Task 2.1
                                          │
                                          ▼
Task 3.1 ──▶ Task 3.2 ──▶ Task 3.3 ──▶ Task 3.4
                                          │
                                          ▼
                                      Task 4.1 ──▶ Task 4.2
```

---

## 验收标准

- [x] 点击"编辑"按钮进入编辑模式
- [x] 可以修改上班/下班时间
- [x] 可以切换正常/请假状态
- [x] 请假时时间选择器隐藏
- [x] 时间校验：上班时间必须早于下班时间
- [x] 保存成功后列表数据刷新
- [x] 网络错误时显示提示并保持编辑状态
