# 工位鱼王

工位鱼王是一个轻量、荒诞、偏娱乐化的社区网站。用户提交匿名化的“摸鱼记录”和办公精神状态，系统在后端统一计算 **0-10 单条 Fish Power Score**，并围绕记录生成称号、评论、排行榜、成就、社区互动和管理审核流程。

项目当前处于 **持续运营、体验打磨与前端 V2 统一阶段**。提交、计分、排行榜、账号、社区、工会、圈子、小组、通知、内容安全和管理后台已经具备。后续开发优先保持现有功能稳定，围绕前端风格统一、接口契约稳定、内容治理、社区增长和运营效率做增量迭代。

---

## 当前阶段重点

1. 保持后端主流程稳定。
2. 统一前端视觉和组件体系。
3. Community Home V2 以 `STYLE_GUIDE.md` 和 `docs/COMMUNITY_V2_DATA_MAP.md` 为基准。
4. 新前端页面优先使用项目自建 tokens 和组件。
5. Pixel UI 是历史依赖，旧页面可暂时保留；新页面不再新增 Pixel UI 组件。
6. 后续再推进数据库访问层治理，为未来 SQLite → PostgreSQL 迁移做准备。

---

## 功能概览

- 摸鱼记录提交：支持昵称或账号显示名、持续时间、描述文本、发布范围和匿名化确认。
- Fish Power Score：后端统一计算单条 0-10 分，支持 AI 裁判结果解析和保守 fallback，不信任客户端提交的分数。
- 累计成长：用户累计分、称号、鱼鳞、钱包、工会贡献等是独立长期成长体系，不 capped 到 10。
- 排行榜：今日榜、周榜、月榜、赛季榜、伪装榜、会议榜和传奇榜。
- 账号与个人主页：注册登录、资料编辑、累计等级称号、徽章、成就、近期记录、公开用户页和鱼鳞钱包。
- 社区互动：社区广场、点赞、收藏、投票、评论、举报、传奇提名和分享卡片。
- 通知中心：覆盖点赞、评论、传奇提名、鱼鳞到账、记录审核状态和小组目标完成通知。
- 社交链路：工会大厅、圈子广场、我的小组、邀请码小组、小组挑战、周目标和贡献排行。
- 内容安全：敏感词、长度限制、疑似隐私内容审核、匿名化确认和持续安全提示。
- 管理后台：记录审核、举报处理、评论管理、用户状态、钱包调整、话题、工会、圈子、小组、安全配置、AI Prompt、站点配置和管理员操作日志。
- 国际化：支持简体中文和英文界面切换。

---

## 技术栈

前端：

- Vue 3
- Vite
- TypeScript
- vue-router
- 图标：`lucide-vue-next`
- 历史依赖：`@mmt817/pixel-ui`

Pixel UI 说明：

- `@mmt817/pixel-ui` 仍可能被旧页面引用。
- Community V2 和后续新页面不再新增 Pixel UI 组件。
- 新前端页面应遵守 `STYLE_GUIDE.md`，使用 `src/styles/tokens.css` 和自建 UI/business 组件。
- 不要为了卸载 Pixel UI 一次性大范围重构；确认无引用后再单独处理。

后端：

- Node.js
- Fastify
- SQLite：`node:sqlite`

共享规则：

- 评分规则、排行榜类型、称号、徽章、社交常量和安全提示集中维护在 `shared/`。

建议使用 Node.js 24 或更新版本运行项目，因为后端使用内置 `node:sqlite`。

---

## 快速开始

```bash
npm install
npm run dev
```

`npm run dev` 会先启动后端 watch 服务，并让 Vite 前端等待 `http://127.0.0.1:3101/api/health` ready 后再启动，避免开发环境启动瞬间的 `/api/*` 代理 `ECONNREFUSED`。

默认地址：

- 前端：`http://127.0.0.1:5173/`
- 后端 API：`http://127.0.0.1:3101`

如果前端端口被占用：

```bash
npm run dev:client -- --port 5174 --strictPort
npm run dev:server
```

单独运行 `npm run dev:client` 时也会等待后端 API；如果只想启动前端，请先在另一个终端运行 `npm run dev:server`。

---

## 常用脚本

```bash
npm run dev                  # 同时启动前端和后端开发服务
npm run dev:client           # 只启动 Vite 前端
npm run dev:server           # 只启动 Fastify 后端 watch 服务
npm run typecheck            # 前后端 TypeScript 类型检查
npm run build                # 类型检查、前端构建、后端编译
npm run start                # 运行 dist-server/server/index.js
npm run api                  # 直接运行 server/index.ts
npm run test:ai-judge        # 运行 AI 裁判相关测试脚本
npm run admin:hash-password -- your-password
```

---

## 环境变量

通用服务配置：

- `PORT`：后端端口，默认 `3101`
- `HOST`：后端监听地址，默认 `127.0.0.1`
- `LOG_LEVEL`：Fastify 日志级别，默认 `info`

代理与限流：

- `TRUST_PROXY`：仅在明确知道可信代理链路时配置。默认不信任客户端传入的 `X-Forwarded-For`。
- 登录、注册、管理员登录接口可能返回 `429`，响应体保持稳定：`{ "message": "请求过于频繁，请稍后再试。" }`。

管理后台必须配置：

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`
- `ADMIN_COOKIE_SECURE`：可选，设为 `true` 时强制管理员 cookie 使用 `Secure`

生成管理员密码哈希：

```bash
npm run admin:hash-password -- your-password
```

AI 裁判可选配置：

- `AI_JUDGE_PROVIDER`：当前支持 `deepseek`
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_BASE_URL`
- `DEEPSEEK_MODEL`
- `DEEPSEEK_TIMEOUT_MS`

没有配置 DeepSeek API Key 时，系统会走保守 fallback，仍可完成本地提交和计分流程。

---

## 项目结构

```text
.
├── src/                 # Vue 前端
│   ├── admin/           # 管理后台页面和布局
│   ├── components/      # 前台组件
│   │   └── community/   # Community V2 组件
│   ├── composables/     # 前台状态和动作编排
│   ├── i18n/            # 简体中文和英文文案
│   ├── pages/           # 前台页面
│   ├── router/          # vue-router 路由
│   ├── services/        # 前端服务封装
│   └── styles/          # tokens/reset/global 样式
├── server/              # Fastify 后端
│   ├── ai/              # AI 裁判调用、解析和 fallback 逻辑
│   ├── adminRoutes.ts   # 管理后台 API
│   ├── database.ts      # SQLite 初始化和数据访问
│   └── routes.ts        # 前台 API
├── shared/              # 前后端共享规则和类型
├── scripts/             # 工具脚本
├── data/                # 本地 SQLite 数据目录
├── docs/                # API/DB/权限/验收/Community V2 数据映射
├── drafts/              # 参考页面 / 静态设计稿
└── prompts/             # Prompt 相关文件
```

---

## 前端路由

前台主要入口：

- `/community`：社区广场，Community Home V2 当前基准页面。
- `/leaderboard`：排行榜。
- `/profile`：个人主页。
- `/profile/wallet`：鱼鳞钱包。
- `/users/:username`：公开用户页。
- `/notifications`：通知中心，需要普通用户登录。
- `/protection`：安全与内容保护。
- `/topics/:slug`：话题详情。
- `/records/:id`：公开记录分享页。
- `/guilds`、`/guilds/:id`：工会大厅和工会详情。
- `/circles`、`/circles/:id`：圈子广场和圈子详情。
- `/groups`、`/groups/:id`：我的小组和小组详情。
- `/announcements`：公告。
- `/checkin`：签到。
- `/feedback`：反馈。
- `/about`：关于。

说明：

- 工会 / 圈子 / 小组详情页如仍是占位页，属于后续功能开发，不应在前端视觉修复中顺手开发。
- 互相关注、话题系统、公开主页等能力如 feature flag 为 false，前端只显示待开放或禁用，不请求不存在接口。

管理后台入口：

- `/admin/login`
- `/admin/dashboard`
- `/admin/records`、`/admin/records/:id`
- `/admin/reports`
- `/admin/comments`
- `/admin/users`
- `/admin/wallets`
- `/admin/transactions`
- `/admin/topics`
- `/admin/guilds`
- `/admin/circles`
- `/admin/groups`
- `/admin/safety`
- `/admin/ai-prompts`
- `/admin/settings`
- `/admin/audit-logs`

除 `/admin/login` 外，所有 `/admin` 页面都会先请求 `/api/admin/auth/me` 验证管理员 httpOnly cookie。

---

## API 概览

基础接口：

- `GET /api/health`
- `GET /api/options`
- `GET /api/stats`
- `GET /api/announcements`
- `POST /api/suggestions`

账号、钱包、签到和通知：

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PATCH /api/auth/me`
- `GET /api/users/:username`
- `GET /api/users/:username/insights`
- `GET /api/wallet/me`
- `GET /api/wallet/transactions`
- `GET /api/checkins/me`
- `POST /api/checkins`
- `GET /api/notifications`
- `GET /api/notifications/unread-count`
- `POST /api/notifications/:id/read`
- `POST /api/notifications/read-all`

记录、排行榜和社区：

- `POST /api/records`
- `GET /api/leaderboards?board=today|week|month|season|disguise|meeting|legendary`
- `GET /api/community/overview`
- `GET /api/community/feed?filter=latest|hot|high|legendary`
- `GET /api/community/hot`（历史接口，如仍存在则保持兼容）
- `GET /api/search?q=keyword`
- `GET /api/topics/popular`
- `GET /api/topics/:slug?filter=latest|hot|high|legendary`
- `GET /api/records/:id/social`
- `GET /api/records/:id/related`
- `POST /api/records/:id/interactions`
- `POST /api/records/:id/comments`
- `POST /api/records/:id/like`
- `POST /api/records/:id/comment`
- `POST /api/records/:id/report`
- `POST /api/records/:id/nominate-legend`
- `GET /api/records/:id/share-card`
- `POST /api/records/:id/share-card`

Community V2 关键接口：

- `GET /api/community/overview`
  - 未登录：`myStats: null`。
  - 登录后：返回当前用户自己的 `weeklyRecordCount`、`weeklyAverageScore`、`cumulativeScore`、`fishScales`、`globalRank`。
  - 始终返回 `siteToday`、`todayTop`、`featureFlags`。
  - `featureFlags.mutualFollowing/topics/profilePages` 当前为 `false`，前端应显示待开放/禁用。

- `GET /api/community/feed?filter=latest|hot|high|legendary`
  - 返回公开、已审核、脱敏后的社区记录。
  - 兼容字段包括 `fishPowerScore`、`primaryTag`、`avatarSeed`、`avatarUrl`、`viewer.favorited`、`viewer.reported`。
  - `viewer.reported` 只代表 `pending/reviewing` active report。
  - 匿名记录不返回真实 userId、username、email、reviewNote。

管理后台接口统一在 `/api/admin` 下。所有后台写操作必须写入 `admin_audit_logs`。

---

## 数据与安全原则

- SQLite 数据文件默认创建在 `data/gongwei-yuwang.sqlite`。
- 当前阶段继续使用 SQLite；后续会先做数据库访问层治理，再为 PostgreSQL 迁移做准备。
- 数据库结构变更必须幂等，不清空现有数据，不破坏旧状态字段。
- 客户端可以展示计分结果，但最终分数必须由后端根据提交内容和规则计算。
- 单条 `fishPowerScore` 必须在 `[0, 10]`。
- 用户累计分、鱼鳞、钱包、工会贡献、互动奖励不是单条评分，不 capped 到 10。
- 举报 active 去重规则：同一用户同一目标只能有一个 `pending/reviewing` 举报；处理结束后允许再次举报。
- 不提供图片、截图或文件上传。
- 不收集真实公司名、部门名、客户名、员工身份、真实地理位置等敏感身份信息。
- 手机号、邮箱、链接、疑似公司全称等内容应进入审核或被阻断。
- 管理员 token 不写入 `localStorage`，后台权限只信任 httpOnly cookie + server-side admin session。
- 普通 bearer token 不能访问 `/api/admin/*`。

安全提示文案：

```text
请不要提交公司机密、个人隐私、员工证件、聊天记录、客户资料或未匿名化截图。
本平台仅供娱乐，不支持真实违反职场规则的行为。
```

---

## 验证

每完成一个功能点后至少运行：

```bash
npm run typecheck
npm run build
```

本地服务启动后建议检查：

```bash
curl http://127.0.0.1:3101/api/health
curl http://127.0.0.1:3101/api/options
curl "http://127.0.0.1:3101/api/leaderboards?board=today"
curl http://127.0.0.1:3101/api/community/overview
curl "http://127.0.0.1:3101/api/community/feed?filter=latest"
curl http://127.0.0.1:3101/api/auth/me
curl http://127.0.0.1:3101/api/admin/auth/me
curl http://127.0.0.1:3101/api/admin/dashboard/summary
```

涉及前端页面时，还需要确认：

- 页面能正常加载。
- 当前路由与导航高亮一致。
- 不同 viewport 下文字、按钮和侧栏不重叠。
- 移动端无横向溢出。
- 涉及登录、个人主页、互动或审核时，需要同时检查登录态和未登录态。
- 管理后台不能由未登录管理员访问。

---

## 开发约定

- 保持轻量架构，除非已有明确需求，不引入微服务、消息队列、Redis、Elasticsearch、云存储或大型权限系统。
- 新前端页面必须先读 `STYLE_GUIDE.md`。
- Community V2 前端必须参考 `docs/COMMUNITY_V2_DATA_MAP.md`，不得 mock 不存在的数据。
- 新增入口前先评估导航高度和移动端布局，避免导航重复。
- 新增互动能力时同步考虑登录要求、排行榜影响、徽章影响、审核流程和个人主页刷新。
- 修改共享规则或接口类型时，同步更新前端类型、后端路由和相关验证。
- 后台审核和内容安全策略优先保守，不引导用户或管理员收集更多真实隐私。
