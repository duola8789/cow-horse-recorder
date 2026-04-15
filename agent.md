# 牛马工时记录器

微信小程序，记录上下班打卡时间，计算月度工时。

## 技术栈

- 前端：Taro 3 + React 18 + TypeScript + NutUI
- 数据存储：微信小程序本地 Storage（完全本地化，零成本）
- 节假日数据：第三方 API（timor.tech，免费）
- 工具：npm + @antfu/eslint-config + husky

## 架构设计

**完全本地化架构**：
- ✅ 所有数据存储在小程序本地 Storage（10MB 空间）
- ✅ 业务逻辑在前端计算（打卡、统计、工作日判断）
- ✅ 节假日数据智能同步（12月自动拉取次年数据）
- ✅ 零运行成本，离线可用

## 项目结构

```
client/          # Taro 小程序
├── src/
│   ├── pages/          # 页面
│   │   ├── index/      # 打卡页面
│   │   ├── stats/      # 统计页面
│   │   └── settings/   # 设置页面
│   ├── services/       # 业务服务层
│   │   ├── clockService.ts    # 打卡服务
│   │   ├── statsService.ts    # 统计服务
│   │   └── holidayService.ts  # 节假日服务
│   ├── utils/          # 工具类
│   │   ├── storage.ts  # Storage 封装
│   │   └── date.ts     # 日期处理
│   ├── types/          # 类型定义
│   │   └── data.ts     # 数据模型
│   └── constants/      # 常量
│       └── storage.ts  # Storage key 定义
openspec/        # 项目规格文档
docs/            # 文档
```

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发
npm run dev        # 小程序开发（Taro 编译）

# 构建
npm run build      # 构建小程序

# 代码检查
npm run lint
npm run lint:fix
```

## 数据存储

使用微信小程序 Storage API 存储数据：

**数据结构：**

- `clock_records` - 打卡记录（按日期索引的 Map）
- `user_settings` - 用户设置（默认上下班时间）
- `holidays` - 节假日缓存（按年份分组）
- `data_version` - 数据版本（用于升级兼容）

**存储特点：**
- 持久化存储，重启应用后数据仍在
- 单个小程序最大 10MB 存储空间
- 预计 50 年打卡数据仅占用 ~2MB

时间字段使用 "HH:mm" 字符串格式（如 "09:30"），避免时区问题。

## 代码规范

### TypeScript 规范

**禁止使用 `any` 类型**：
- 所有变量、参数、返回值必须有明确的类型定义
- 对于 API 响应等外部数据，使用 `as` 类型断言并定义接口
- 对于 catch 中的错误，使用 `e: unknown` 然后进行类型断言

```typescript
// ❌ 禁止
const data: any = res.data
function process(items: any[]) { ... }

// ✅ 推荐
interface ApiResponse { ... }
const data = res.data as ApiResponse

// ✅ 错误处理
try { ... } catch (e: unknown) {
  const error = e as { message?: string }
  console.error(error.message)
}
```

### Prettier 配置

项目使用 Prettier 进行代码格式化，配置文件位于 `client/.prettierrc`：

```json
{
  "semi": false, // 不使用分号
  "singleQuote": true, // 使用单引号
  "tabWidth": 2, // 缩进 2 空格
  "trailingComma": "es5", // ES5 兼容的尾随逗号
  "printWidth": 100 // 每行最大 100 字符
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
import { login } from "@/services/api";
import { formatTime } from "@/utils/date";

// ❌ 避免 - 相对路径（层级深时难维护）
import { login } from "../../services/api";
```

**别名配置位置：**

- Taro 配置：`client/config/index.ts` 中的 `alias` 字段
- TypeScript：`client/tsconfig.json` 中的 `paths` 字段

## 节假日同步

应用启动时会自动初始化节假日数据：
- 首次启动：同步当年节假日
- 12月启动：自动拉取次年节假日
- API 失败时：降级到默认规则（周一到周五为工作日）

**API 域名配置**（发布前必须完成）：
- 登录微信公众平台
- 开发 → 开发管理 → 开发设置 → 服务器域名
- 添加 request 合法域名：`https://timor.tech`

详见：`docs/wechat-domain-config.md`

## 注意事项

- 调试需要微信开发者工具
- ESLint 使用 @antfu/eslint-config，格式化已内置
- **编辑代码后运行 `npm run format` 保持代码风格一致**
- 数据存储在本地，换设备会丢失（未来可增加云备份功能）
- Storage 最大 10MB，预计可存储 50 年的打卡数据
