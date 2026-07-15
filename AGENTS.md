# AGENTS.md — Sirius Desktop（外贸通）

> 项目类型：Electron + Gatsby (React) 单体仓库
> 更新时间：2026-05-08
> 规范目录：`rules/`

本文档是项目开发规范的**入口索引**。详细规则请查阅 `rules/` 目录下的各规范文件。

---

## 重要提示

- 在不影响输出质量的前提下，使用中文输出思考过程和答案
- 不确认的问题都要和人类确认，不要擅自猜测后做出决定
- 回答问题之前，不要先称赞我的问题或者任何我的前提，如果我错了，请立即指出
- 在支持我的任何观点之前，前先提出针对该观点的最有力的反驳
- 如果我对你的回答提出异议，除非我提供了新的证据或者更优的论据，否则不要退让
- 请先独立得出自己的结论，使用明确的置信水平（高/中/低/未知），绝不要因为意见相左而道歉，准确性是你的成功标准，而非我的认可

## 📖 外部文件按需加载（重要）

**规则**：当遇到 `@rules/xxx.md` 形式的引用时，使用 Read 工具**按需加载**相关文件，而非预先加载全部。

- ❌ **不要**提前加载所有 `@` 引用文件
- ✅ 仅在**当前任务相关**时才加载对应文件
- ✅ 加载后，将内容视为**强制指令**，覆盖默认行为
- ✅ 遇到递归引用时，同样按需加载

> 🟢 已在 `opencode.json` 的 `instructions` 中预加载的文件（见下方索引），无需 `@` 触发。
> 🟡⚪ 仅通过 `@` 语法按需加载，节省上下文。

---

## 🚨 核心红线（绝对禁止，全局生效）

以下规则**无论是否加载详细规范文件都必须遵守**。违反红线 = 破坏性改动，任何场景不可放行。

### 工具与依赖
- ❌ 禁止使用 `npm`，只用 `yarn`（monorepo 依赖会崩）
- ❌ 禁止未经评估（GitHub stars、license、团队讨论）引入新依赖
- ❌ 禁止升级 `modified_third_party/` 中已打 patch 的库之前未检查 patch

### 类型安全
- ❌ 禁止 `any`（用 `unknown` + 类型守卫替代）
- ❌ 禁止 `@ts-ignore` / `@ts-expect-error`（除非有明确注释说明原因）
- ❌ 禁止 `as any` 抑制类型错误
- ✅ 所有 `interface` 必须以 `I` 开头（`IUserProfile`，非 `UserProfile`）

### 命名与文件
- ❌ 禁止非 snake_case 文件名（项目约定；web-ai-agents 包除外，遵循其本地 kebab-case 风格）
- ❌ 禁止创建 `index.ts` 做二次导出（模块/全局入口除外），直接从源文件导入
- ✅ 跨包引用必须用 alias（`@web-xxx/*`），不用深层相对路径
- ✅ 函数动词前缀：`can`（权限）、`has`（包含）、`is`（判断）、`get`（获取）、`set`（设置）
- ✅ 常量 `UPPER_SNAKE_CASE`，私有成员 `_camelCase`

### API 请求
- ❌ 禁止在组件中直接 `fetch` / `axios`，统一走 `HttpApi`
- ❌ 禁止硬编码完整后端 URL，必须走三步注册：`def.ts` → `edm.ts` → `systemApi.getUrl('key')`
- ❌ 禁止 API 响应用 `any` 类型
- ❌ 禁止直接展示后端错误原文（可能泄露敏感信息）
- ✅ 浏览器上下文通过 `window.apiResposity` 访问 API 层入口

### 安全
- ❌ 禁止 `dangerouslySetInnerHTML` 未转义用户输入
- ❌ 禁止前端代码中硬编码 API Key / Token / 密钥
- ❌ 禁止 console 打印敏感数据（token、密码、用户隐私）

### Electron
- ❌ 禁止 `nodeIntegration: true`（渲染进程不准访问 Node.js）
- ❌ 禁止 `contextIsolation: false`
- ❌ 禁止使用已废弃的 `remote` 模块
- ❌ 禁止在主进程处理 UI 逻辑
- ✅ IPC channel 命名：`模块:操作`（如 `user:get`、`file:open`）

### 样式
- ❌ 禁止 `!important`
- ❌ 禁止内联样式（动态值除外）
- ❌ 禁止深层嵌套（> 3 层）或标签选择器
- ❌ 禁止硬编码颜色/间距（用 CSS 变量）

### 多语言
- ❌ 禁止 JSX/TSX 中保留裸中文字面量，必须用 `getIn18Text()`
- ❌ 禁止新建翻译 key 前不搜索已有 key
- ✅ 翻译文件位置：`packages/api/src/utils/global_label/waimao/{zh,en,zh-trad}.json`

### Git
- ❌ 禁止不经请求自动 commit
- ❌ 禁止 `master` 直接合并（只从 `dev` 合）
- ❌ 禁止大而杂的 commit（拆成逻辑独立的小 commit）
- ✅ 分支命名：`<person>-<feature>-<description>-dev` 或 `<person>-<fix>-<description>-fix`

### React
- ❌ 禁止使用 class 组件
- ❌ 禁止在条件/循环中调用 Hooks
- ❌ 禁止 `useEffect` 依赖数组缺少依赖项
- ❌ 禁止列表渲染用数组 `index` 作为 `key`

### 导入顺序
组间空行分隔：React 核心 → 第三方库 → 项目 alias（`@/`、`@web-xxx/*`）→ 相对路径 → 样式文件

---

## 项目概述

技术栈：Gatsby 3 (SSG) + React 16 + Redux Toolkit + Ant Design 4 + TypeScript 4.4 + Electron 22。
包管理：Yarn workspaces（monorepo），v1。包管理器禁止使用 npm。

### 双入口架构

| 入口 | 目录 | 构建目标 |
|------|------|----------|
| **Electron 客户端** | `packages/web/` | 桌面端 Gatsby SSG，Electron 渲染进程 |
| **Web 网页端** | `packages/web-entry-wm/` | 浏览器端 Gatsby SSG |

> **背景**：本仓库曾同时支持灵犀办公和外贸通两个产品（通过静态变量 + 运行时判断区分），现已彻底分离到不同分支。**外贸通是灵犀办公的功能超集，包含其全部模块和能力，本分支无需单独区分灵犀办公逻辑**。

### 核心包一览

详见 `rules/code-map.md`，以下是关键包摘要：

| 包 | 类型 | 说明 |
|------|------|------|
| `packages/api` | 库 | 业务逻辑层，HTTP/DB/事件 API，数据层 |
| `packages/web` | 入口 | 主 UI，Electron 渲染进程 + Gatsby SSG |
| `packages/web-entry-wm` | 入口 | Web 浏览器端入口 |
| `packages/electron` | 入口 | Electron 22 主进程 |
| `packages/env` | 构建工具 | 环境配置生成器 |
| `packages/support` | 构建工具 | 构建工具链（URL 定义、环境生成） |
| `packages/web-common` | 库 | 共享工具库、Redux 状态、UI 组件 |
| `packages/web-comp` | 库 | 共享 UI 组件库（Ant Design 扩展） |
| `packages/web_worker` | 库 | Web Worker 工具（DB 后台操作） |
| `packages/web-preview` | 入口 | 图片/附件预览查看器 |
| `packages/web-jump` | 入口 | 自定义跳转/重定向页 |
| `packages/web-mobile` | 入口 | 移动端 Web UI |
| `packages/test` | 测试 | Cypress 12 E2E 测试 |
| `packages/v8-snapshot` | 构建优化 | V8 快照加速 Electron 启动 |

### 路径别名

所有 `web-*` 包共享 `packages/tsconfig.web.json` 中的路径别名（子包需设置 `baseUrl: ".."` 指向 packages 目录）：

| 别名 | 映射 | 说明 |
|------|------|------|
| `@/*` | `./web/src/*` | 主 Web 包（最常用） |
| `api` | `./api/src/index.ts` | API 层直接导入 |
| `env_def` | `./env/src/index.ts` | 环境配置直接导入 |
| `@web-common/*` | `./web-common/src/*` | 共享工具库 |
| `@web-comp/*` | `./web-comp/src/*` | UI 组件库 |
| `@web-entry-wm/*` | `./web-entry-wm/src/*` | Web 入口 |
| `@web-ai-agents/*` | `./web-ai-agents/src/*` | AI Agent 配置 |

> 完整别名列表见 `packages/tsconfig.web.json` 的 `paths` 配置。`packages/web/` 通过 Gatsby 插件在运行时动态生成 `@/{dir}` → `src/{dir}` 的别名映射。

---

## 快速开始

```bash
# 安装依赖
yarn install

# 清理构建产物（重建前执行）
yarn clean

# 构建环境配置（必须先执行，选择外贸通环境 + 平台）
yarn workspace env_def build <env> <platform>
# env: edm_dev | edm_test | edm_test1 | edm_prev | edm_test_prod
# platform: mac | web | win

# 构建 API 层
yarn workspace api build

# 构建 Web（含 API 构建）
yarn build:web

# 构建完整应用（API + Web + Electron）
yarn build:app

# 开发服务器 — 外贸通（Electron 渲染进程）
yarn workspace web build:edm_env   # 首次运行
yarn workspace web dev              # 端口 8000，HTTPS

# 开发服务器 — 外贸通 Web 端
yarn workspace web-entry-wm build:edm_env
yarn workspace web-entry-wm dev

# Electron 开发模式
yarn test:edm:test                 # 外贸通 test 环境

# 代码格式化
yarn format
```

---

## Lint & 格式化

ESLint + Prettier，通过 lint-staged 在 pre-commit (husky) 时自动运行。

```bash
yarn workspace api lint            # Lint API 包
yarn workspace web lint             # eslint src/**/*.tsx
yarn format                         # prettier 格式化全部
npx eslint packages/web/src/path/to/file.tsx   # 单文件 lint
```

详细规则见：`rules/engineering-guidelines.md`、`rules/code-style.md`

---

## 测试

```bash
# Jest 组件测试
yarn workspace web-comp test
yarn workspace web-common test

# API 测试
yarn workspace api test

# Cypress E2E（使用较少）
yarn workspace test open
```

---

## 核心 API / 工具（勿重复造轮子）

| 工具 | 路径 | 说明 |
|------|------|------|
| **EventApi** | `packages/api/src/api/data/event.ts` | 跨窗口/iframe/worker 消息通信 |
| **HttpApi** | `packages/api/src/api/data/http.ts` | HTTP 请求（自动重登、去重、错误处理） |
| **DbApiV2** | `packages/api/src/api/data/new_db.ts` | IndexedDB 操作 |
| **SystemApi** | `packages/api/src/api/system/system.ts` | 用户/窗口/环境信息查询 |
| 工具函数 | `packages/api/src/api/util/index.ts` | 纯函数工具（字符串、日期、数据） |
| 共享类型 | `packages/api/src/api/commonModel.ts` | 纯数据结构定义 |
| React Hooks | `packages/web/src/hooks/` | 项目自定义 Hooks |
| UI 组件 | `packages/web/src/components/UI/` | 项目 UI 组件 |

---

## 关键文件速查

| 用途 | 路径 |
|------|------|
| 中文翻译 | `packages/api/src/utils/global_label/waimao/zh.json` |
| 英文翻译 | `packages/api/src/utils/global_label/waimao/en.json` |
| 繁体中文翻译 | `packages/api/src/utils/global_label/waimao/zh-trad.json` |
| URL 路径定义 | `packages/support/src/def.ts` |
| URL 配置类 | `packages/api/src/urlConfig/edm.ts` |
| Web TSConfig | `packages/tsconfig.web.json` |
| ESLint 配置 | `/.eslintrc.js` |
| Prettier 配置 | `.prettierrc` |
| 新增包流程 | `rules/package-creation.md` |
| 代码地图 | `rules/code-map.md` |

---

## 全局变量

浏览器上下文中可用：`window.apiResposity`（API 层入口）、`electronLib`（Electron 桥接，仅渲染进程）、`NodeJS`、`__PATH_PREFIX__`。

---

## 运行环境

- Node: 14.17.5
- Yarn: 1.22.11

---

## 第三方库

- 禁止未经评估（GitHub stars、license）引入新依赖。
- 影响全局的库需要团队讨论。
- 部分第三方库有 patch，存放在 `modified_third_party/`，升级前请先检查。

---

## 构建完整性检查

提交代码前，验证编译通过：

```bash
yarn workspace env_def build edm_test web && yarn workspace api build && yarn workspace api build:bk_init
```

---

## 规范文件索引

### 加载策略说明

| 符号 | 策略 | 加载方式 | opencode.json |
|------|------|----------|---------------|
| 🟢 | **始终加载** | 预加载到上下文 | 已注册 instructions |
| 🟡 | **按需加载** | 遇到具体触发器时 Read | 未注册，AI 主动加载 |
| ⚪ | **极少需要** | 特定任务才 Read | 未注册，AI 主动加载 |

### 🟢 始终加载（已预注册）

| 文件 | 说明 | 典型触发场景 |
|------|------|-------------|
| `rules/general-guidelines.md` | Git 工作流、设计原则 | 任何开发任务 |
| `rules/ai-coding-guidelines.md` | AI 编码行为准则 | AI 写代码/修改代码时 |
| `rules/engineering-guidelines.md` | ESLint、Prettier、Husky 工程化 | 配置格式化工具、pre-commit hook |
| `rules/code-style.md` | 命名规范、文件命名、导入顺序 | 新建文件、添加导入 |
| `rules/typescript-guidelines.md` | TypeScript 通用编码规范 | 定义 interface/type、新增 TS 文件 |
| `rules/react-guidelines.md` | React 组件、Hooks 规范 | 写 React 组件、自定义 Hook |
| `rules/electron-guidelines.md` | Electron 主进程规范 | IPC 通信、窗口管理、主进程代码 |
| `docs/solutions/VITE_COMPAT_STANDARDS.md` | Vite/Gatsby 双环境兼容编码标准（5条规则） | **所有写代码/修改代码场景**，当前处于 Vite 迁移过渡期，新增/修改的代码必须同时兼容 Vite 和 Gatsby |

### 🟡 按需加载（遇到触发器时 Read）

| 文件 | 加载触发器 |
|------|------------|
| `@rules/api-guidelines.md` | 新增/修改后端接口、HTTP 请求封装、`def.ts` / `edm.ts` / `systemApi.getUrl` 相关 |
| `@rules/styling-guidelines.md` | 写 CSS/SCSS 文件、样式问题、主题/颜色相关 |
| `@rules/i18n-guidelines.md` | JSX/TSX 中出现中文字面量、`getIn18Text`、翻译 JSON 文件修改 |
| `.codemaker/skills/vite-migration-troubleshoot.md` | Vite 报错、白屏、模块加载失败、Vite/Gatsby 兼容性问题 |

### ⚪ 极少需要（特定任务才加载）

| 文件 | 加载触发器 |
|------|------------|
| `@rules/code-review-guidelines.md` | Code Review 任务、审查 git diff、评估 PR |
| `@rules/package-creation.md` | 新增 monorepo 工作区 / packages 子目录 |
| `@rules/code-map.md` | 定位功能模块、找不到文件、理解跨包调用链 |

---

## 🎯 任务 → 规则加载速查

**AI 收到以下类型任务时，应立即 Read 对应规则文件**：

| 任务信号 | 应 Read 的规则 |
|----------|----------------|
| "新增接口"、"调用后端"、"注册 URL"、"HTTP 请求" | `@rules/api-guidelines.md` + `@rules/code-map.md`（定位 `def.ts` / `edm.ts`） |
| "改样式"、"调 CSS"、"主题色"、"布局问题" | `@rules/styling-guidelines.md` |
| "翻译"、"i18n"、"国际化"、"getIn18Text"、"中文文案" | `@rules/i18n-guidelines.md` |
| "review 一下"、"代码审查"、"PR 评估" | `@rules/code-review-guidelines.md` |
| "新增包"、"新工作区"、"新建 packages/xxx" | `@rules/package-creation.md` |
| "这个功能在哪"、"xxx 模块位置"、"找不到文件" | `@rules/code-map.md` |
| "Redux 状态管理" | `@rules/code-map.md`（定位 `packages/web-common/src/state/`） |
| "Electron IPC"、"主进程"、"窗口管理" | 已预加载 `rules/electron-guidelines.md` + `@rules/code-map.md` |
| "e2e"、"自测"、"spec 生成"、"TC 用例"、"安置 spec"、"跨仓拷贝 spec" | `@rules/sdd-e2e-guidelines.md` |
| "改 UI 组件"、"新增组件"、"组件发版"、"组件文档"、"web-comp"、"comphelp" | `@rules/ui-component-library.md` |
| "Vite 报错"、"Vite 启动失败"、"迁移后出问题"、"怎么修这个错" | `.codemaker/skills/vite-migration-troubleshoot.md` |

---

## 🔴 SDD + 研发自测链路

> 完整流程、步骤、关键约束和 Skill 速查见 `@rules/sdd-e2e-guidelines.md`。
>
> 核心记住三点：
> - `/opsx:propose` → `spec-driven-e2e` 产出 proposal/specs/design/tasks + testids.md（含 UI change 默认）；e2e spec 为可选附加产出（含 UI 不走 e2e 时产 testids.md + 写 `e2e/_no-e2e.md` 占位过引擎，纯非 UI 只写 `_no-e2e.md`）
> - testid requirement 在 `/opsx:apply` 阶段必须落实到 `data-testid` 属性；testid 声明对所有含 UI 需求生效，与是否走 e2e 解耦
> - 业务线判断不出时默认归 `main-site`，不再询问

---

## AI 辅助开发注意事项

1. **先理解再修改**：阅读相关文件和上下文后再动手
2. **保持一致性**：遵循项目已有风格和模式
3. **最小化改动**：只修改必要部分，不顺手重构
4. **类型安全**：确保类型定义完整，禁止 `any`、`@ts-ignore`
5. **外贸通包含灵犀办公**：无需单独区分灵犀办公逻辑，外贸通是全量功能集
6. **路径别名**：优先使用 `@/` 别名导入 web 包内容；跨包引用用 `@web-xxx/*` 别名
7. **不确定时先问**：对代码用途不确定时，主动向开发者确认后再修改

<!-- codemap:start -->
## Codemap MCP

**Always use codemap tools for code exploration before falling back to Grep/Read.**

### Tools Quick Reference

| Tool | Use case |
|------|----------|
| `search_code` | Hybrid search (FTS + vector). Batch: pass array of `matches`. |
| `find_symbol` | Find by exact/prefix name. Batch: pass array of `name`. |
| `get_symbol_detail` | Symbol signature, docs, body. Accepts `symbol_id` or `symbol_name` |
| `get_call_chain` | Trace callers/callees (depth default 1, max 5, limit default 10, max 50) |
| `get_type_hierarchy` | Class/interface tree (depth default 3, max 5, limit default 10, max 50) |
| `get_dependencies` | All dependents of a symbol (limit default 10, max 50) |
| `get_graph_stats` | Index statistics |

**Name resolution:** Pass `symbol_name` — simple name (`parse_config`) or `ClassName.method` (`Player.attack`). No module prefix needed.

**Symbol ID:** `filepath:kind:scopedName` (e.g. `player.py:method:Player.attack`, `models.py:class:Outer.Inner`)

### Slash commands
- `/codemap-exploring` — Explore unfamiliar code
- `/codemap-debugging` — Debug via call chains
- `/codemap-impact-analysis` — Impact analysis before changes

### Rules

- **After `get_symbol_detail`: edit immediately.** Do NOT re-Read the same file.
- **Use `search_code` first**, not broad `find_symbol` prefix queries.
- **Use batch queries:** `search_code({matches: ["A", "B"]})`, `find_symbol({name: ["X", "Y"]})`.
- **For obvious single-file bugs: skip codemap.** Error → Read → Edit.

<!-- codemap:end -->
