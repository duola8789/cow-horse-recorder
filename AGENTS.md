# 牛马工时记录器

微信小程序，记录上下班打卡时间，计算月度工时。

## 重要提示

- 在不影响输出质量的前提下，使用中文输出思考过程和答案
- 不确认的问题都要和人类确认，不要擅自猜测后做出决定
- 回答问题之前，不要先称赞我的问题或者任何我的前提，如果我错了，请立即指出
- 在支持我的任何观点之前，前先提出针对该观点的最有力的反驳
- 如果我对你的回答提出异议，除非我提供了新的证据或者更优的论据，否则不要退让
- 请先独立得出自己的结论，使用明确的置信水平（高/中/低/未知），绝不要因为意见相左而道歉，准确性是你的成功标准，而非我的认可

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

### Emoji 表情（禁止直接使用字符）

**禁止**在代码中直接使用 emoji 字符（如 `😢`、`😊`、`☀️`、`🔔`、`🟢` 等）。原因：Android 真机系统 emoji 字体在微信小程序渲染层可能不可用，会导致所有 emoji 显示为方框（已踩坑，且无法通过 `font-family` 修复）。

**替代方案**：使用 `@/utils/emoji` 的 `EMOJI` 模块，通过 `<Image>` 组件渲染 OpenMoji 彩色 SVG（base64 data URI 内嵌，不依赖系统字体）。

```tsx
// ❌ 禁止 - 直接用 emoji 字符
<Text className="icon">😢</Text>
<Text>📅 每日明细</Text>

// ✅ 推荐 - 用 EMOJI 模块
import { Image } from '@tarojs/components'
import { EMOJI } from '@/utils/emoji'

<Image className="icon" src={EMOJI.sad} />

// emoji 与文字混排时,用 View + Image + Text 组合
<View className="title">
  <Image className="title-icon" src={EMOJI.calendar} />
  <Text>每日明细</Text>
</View>
```

**新增 emoji 时**：从 [OpenMoji](https://openmoji.org)（CC BY-SA 4.0，需署名）下载对应 SVG 到 `client/src/assets/emoji/`（文件名为 Unicode 码点，如 `1F622.svg`），再用 base64 重新生成 `src/utils/emoji.ts`。`<Image>` 必须在 scss 中设置 `width`/`height`（`font-size` 对 Image 无效）。

## 版本号管理

**版本号定义在 `client/package.json` 的 `version` 字段**——设置页「关于」显示的版本号由 `client/config/index.ts` 从它读取并注入 `APP_VERSION`。

⚠️ **根目录 `package.json`（cow-horse-recorder-root）也有 `version` 字段，升级时必须同时修改两个文件，保持一致。** 曾多次只改 client 漏改根，导致根 package.json version 落后、工作树残留未提交改动。提交前用 `grep '"version"' package.json client/package.json` 确认两者一致。

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
- **禁止直接使用 emoji 字符**：Android 真机会显示为方框，必须用 `@/utils/emoji` 的 `EMOJI` 模块渲染（见「代码规范 > Emoji 表情」）
- **升级版本号时，`client/package.json` 和根 `package.json` 两个都要改**，保持一致（见「版本号管理」）
- 数据存储在本地，换设备会丢失（未来可增加云备份功能）
- Storage 最大 10MB，预计可存储 50 年的打卡数据
