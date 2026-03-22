# 牛马工时记录器

一个微信小程序，用于记录上下班打卡时间，计算当月工时。

## 功能

- 📱 上班/下班打卡（自动识别上午/下午）
- 📊 月度工时统计（T+1）
- ⚙️ 设置默认上下班时间

## 本地开发

### 环境要求

- Node.js >= 18
- 微信开发者工具

### 安装

```bash
# 克隆项目
git clone <repo-url>
cd cow-horse-recorder

# 一键安装所有依赖（根目录 + client + 所有云函数）
npm install
```

### 启动开发

**推荐：一键启动全部**

```bash
# 同时启动小程序开发 + 云函数自动编译
npm run dev:all
```

**或者分别启动：**

```bash
# 终端 1：启动 Taro 编译（监听模式）
npm run dev

# 终端 2：启动云函数自动编译（监听 .ts 文件变化）
npm run dev:cloud
```

然后：
1. 打开微信开发者工具
2. 导入项目，选择项目根目录 `cow-horse-recorder/`
3. 工具会自动识别 `project.config.json` 配置

### 云开发配置

1. 在微信开发者工具中开通云开发
2. 创建云开发环境，记下环境 ID
3. 在 `client/src/app.tsx` 中配置环境 ID：
   ```typescript
   Taro.cloud.init({
     env: 'your-env-id'
   })
   ```

### 云函数开发

云函数使用 TypeScript 编写，需要编译为 JavaScript 后部署。

**开发流程：**

```bash
# 修改云函数代码（index.ts）
vim cloudfunctions/login/index.ts

# 方式 1：自动编译（开发时推荐）
npm run dev:cloud   # 监听变化，自动编译

# 方式 2：手动编译
npm run build:cloud # 编译所有云函数
```

**部署方式：**
1. 确保云函数已编译（目录下有 `index.js`）
2. 在微信开发者工具中右键云函数目录
3. 选择「上传并部署：云端安装依赖」

**调试方式：**

| 方式 | 说明 | 适用场景 |
|------|------|----------|
| 云端调试 | 部署后直接调用 | 推荐，最接近真实环境 |
| 本地调试 | 开发者工具「开启云函数本地调试」 | 部分 API 受限 |

### 数据库

在微信开发者工具「云开发」面板中：
1. 创建集合：`users`、`clock_records`、`holidays`
2. 配置权限：所有用户可读写自己的数据

## 发布上线

### Step 1: 构建生产版本

```bash
cd client
npm run build:weapp
```

### Step 2: 微信开发者工具上传

1. 打开微信开发者工具，导入项目根目录 `cow-horse-recorder/`
2. 预览检查功能是否正常
3. 点击右上角 **「上传」** 按钮
4. 填写版本号（与 `client/package.json` 中的 `version` 一致）和项目备注

### Step 3: 云函数部署

如果云函数有更新，需要单独部署：

1. 在微信开发者工具中展开 `cloudfunctions` 目录
2. 右键点击需要更新的云函数（如 `getMonthlyRecords`）
3. 选择 **「上传并部署：云端安装依赖」**

### Step 4: 提交审核

1. 登录 [微信公众平台](https://mp.weixin.qq.com)
2. 进入 **管理 → 版本管理**
3. 在「开发版本」找到刚上传的版本
4. 点击 **「提交审核」**，填写版本说明

### Step 5: 发布

审核通过后（通常 1-2 个工作日），回到版本管理页面：
1. 点击 **「发布」**
2. 选择「全量发布」或「分阶段发布」

### 版本号管理

版本号在 `client/package.json` 中维护，设置页会自动读取并显示。发布新版本前记得更新：

```json
{
  "version": "1.0.1"
}
```

### 常见问题

**Q: 云函数调用失败？**
A: 检查是否已上传部署，检查环境 ID 是否正确

**Q: 本地调试时云数据库无法访问？**
A: 云数据库只能在真机或云端访问，本地调试受限

**Q: TabBar 图标不显示？**
A: 当前使用占位图标，请替换 `client/src/assets/icons/` 中的图片

## 技术栈

- Taro 3 + React 18 + TypeScript
- NutUI (UI 组件库)
- 微信云开发
- dayjs (日期处理)

## License

MIT
