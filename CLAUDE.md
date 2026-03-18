# 牛马工时记录器

微信小程序，记录上下班打卡时间，计算月度工时。

## 技术栈

- 前端：Taro 3 + React 18 + TypeScript + NutUI
- 后端：微信云开发（云函数 + 云数据库）
- 工具：npm + @antfu/eslint-config + husky

## 项目结构

```
client/          # Taro 小程序
cloudfunctions/  # 云函数（每个函数独立目录，TypeScript 源码 + 编译产物）
scripts/         # 构建脚本（云函数编译、安装依赖等）
openspec/        # 项目规格文档
```

## 开发命令

```bash
# 安装依赖（一键安装所有：根目录 + client + 云函数）
npm install

# 启动开发（推荐：同时启动小程序 + 云函数监听）
npm run dev:all

# 或分别启动
npm run dev        # 小程序开发（Taro 编译）
npm run dev:cloud  # 云函数自动编译（监听 .ts 变化）

# 构建
npm run build        # 构建小程序
npm run build:cloud  # 编译所有云函数

# 代码检查
npm run lint
npm run lint:fix
```

## 云函数

云函数使用 TypeScript 编写，需要编译为 JavaScript 后才能部署。

### 开发流程

```bash
# 编译所有云函数（TypeScript → JavaScript）
npm run build:cloud

# 安装云函数依赖（首次或添加新函数时）
npm run install:cloud

# 监听变化自动编译（开发时）
npm run dev:cloud

# 同时启动小程序开发和云函数监听
npm run dev:all
```

### 部署方式

编译完成后，通过微信开发者工具右键上传：
1. 在开发者工具中打开 cloudfunctions 目录
2. 右键点击要部署的云函数
3. 选择"上传并部署：云端安装依赖"

### 函数列表
- login - 登录
- clock - 打卡
- getStats - 月度统计
- getTodayStatus - 今日状态
- updateSettings - 更新设置
- syncHolidays - 同步节假日

## 数据库

使用微信云数据库（文档型）：
- users - 用户表
- clock_records - 打卡记录
- holidays - 节假日

时间字段使用 Date 类型，前端用 dayjs 处理。

## 代码规范

### Prettier 配置

项目使用 Prettier 进行代码格式化，配置文件位于 `client/.prettierrc`：

```json
{
  "semi": false,           // 不使用分号
  "singleQuote": true,     // 使用单引号
  "tabWidth": 2,           // 缩进 2 空格
  "trailingComma": "es5",  // ES5 兼容的尾随逗号
  "printWidth": 100        // 每行最大 100 字符
}
```

**格式化命令：**
```bash
cd client
npm run format        # 格式化所有文件
npm run format:check  # 检查格式（不修改）
```

### 路径别名 @

项目配置了 `@` 别名指向 `src/` 目录，**优先使用别名导入**：

```tsx
// ✅ 推荐 - 使用 @ 别名
import { login } from '@/services/api'
import { formatTime } from '@/utils/date'

// ❌ 避免 - 相对路径（层级深时难维护）
import { login } from '../../services/api'
```

**别名配置位置：**
- Taro 配置：`client/config/index.ts` 中的 `alias` 字段
- TypeScript：`client/tsconfig.json` 中的 `paths` 字段

## 注意事项

- 云函数不共享 node_modules，每个函数目录单独 `npm install`
- 调试需要微信开发者工具
- 云函数本地调试功能有限，建议部署到测试环境调试
- ESLint 使用 @antfu/eslint-config，格式化已内置
- **编辑代码后运行 `npm run format` 保持代码风格一致**
