## Why

微信云开发的云数据库收费 19.9 元/月，对于个人小工具不值得。云环境将于 2026-04-21 到期。需要迁移到完全本地化的架构，实现零成本运行。

## What Changes

- 将所有数据从云数据库迁移到小程序本地 Storage
- 删除所有云函数，业务逻辑迁移到前端
- 去除用户登录认证（单用户应用）
- 实现智能节假日同步（12月自动拉取次年数据）
- 保持所有现有功能：打卡、统计、设置

## Capabilities

### New Capabilities
- `local-storage-layer`: 封装微信 Storage API，提供类型安全的数据存储层
- `clock-service`: 本地打卡业务逻辑服务（上班/下班打卡、记录管理）
- `stats-service`: 本地统计计算服务（月度工时统计、工作日计算）
- `holiday-service`: 节假日管理服务（智能同步、工作日判断）

### Modified Capabilities
- `stats-api`: 从云函数调用改为本地服务调用
- `settings-ui`: 从云端存储改为本地存储

## Impact

**代码变更：**
- 删除 `cloudfunctions/` 目录下所有云函数
- 新增 `client/src/utils/storage.ts` 存储封装层
- 新增 `client/src/services/` 目录下的业务服务
- 修改所有页面的数据获取和存储逻辑

**配置变更：**
- 删除 `app.config.ts` 中的 `cloud: true`
- 添加节假日 API 域名到微信公众平台白名单：`https://timor.tech`

**数据变更：**
- 不做数据迁移，用户从零开始使用本地存储
- 数据格式从云数据库结构转换为扁平化 JSON 结构

**依赖变更：**
- 移除 `wx-server-sdk` 依赖（云函数）
- 保留 `dayjs` 用于时间处理
