# 工位鱼王

工位鱼王是一个轻量、荒诞、偏娱乐化的社区网站。用户提交匿名化的“摸鱼记录”和办公精神状态，系统在后端统一计算 Fish Power Score，并围绕记录生成称号、评论、排行榜、成就、社区互动和管理审核流程。

项目当前处于持续运营与功能深化阶段：提交、计分、排行榜、账号、社区、工会、圈子、小组、通知、内容安全和管理后台已经具备。后续开发优先保持现有功能稳定，围绕体验打磨、社区增长、内容治理和运营效率做增量迭代。

## 功能概览

- 摸鱼记录提交：支持昵称或账号显示名、摸鱼类型、持续时间、风险场景、伪装方式、创意描述、话题标签、发布范围和匿名化确认。
- Fish Power Score：后端统一计算分数，支持规则化得分、AI 裁判结果解析和保守回退，不信任客户端提交的分数。
- 排行榜：今日榜、周榜、月榜、赛季榜、伪装榜、会议榜和传奇榜，支持榜单切换与昵称筛选。
- 账号与个人主页：注册登录、资料编辑、累计等级称号、徽章、成就、近期记录、公开用户页和鱼鳞钱包。
- 社区互动：社区广场、话题详情、点赞、收藏、投票、评论、举报、传奇提名和分享卡片。
- 通知中心：覆盖点赞、评论、传奇提名、鱼鳞到账、记录审核状态和小组目标完成通知。
- 社交链路：工会大厅、圈子广场、我的小组、邀请码小组、小组挑战、周目标和贡献排行。
- 搜索与发现：按记录、话题、用户、工会、圈子和公开小组分组展示轻量搜索结果。
- 内容安全：敏感词、长度限制、疑似隐私内容审核、匿名化确认和持续安全提示。
- 管理后台：记录审核、举报处理、评论管理、用户状态、钱包调整、话题、工会、圈子、小组、安全配置、AI Prompt、站点配置和管理员操作日志。
- 国际化：支持简体中文和英文界面切换。

## 技术栈

前端：

- Vue 3
- Vite
- TypeScript
- vue-router
- Pixel UI：`@mmt817/pixel-ui`
- 图标：`lucide-vue-next`

后端：

- Node.js
- Fastify
- SQLite：`node:sqlite`

共享规则：

- 评分规则、排行榜类型、称号、徽章、社交常量和安全提示集中维护在 `shared/`。

建议使用 Node.js 24 或更新版本运行项目，因为后端使用内置 `node:sqlite`。

## 快速开始

安装依赖：

```bash
npm install
```

启动前后端开发服务：

```bash
npm run dev
```

默认地址：

- 前端：`http://127.0.0.1:5173/`
- 后端 API：`http://localhost:3001`

如果前端端口被占用，可以分别启动：

```bash
npm run dev:client -- --port 5174 --strictPort
npm run dev:server
```

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

## 环境变量

通用服务配置：

- `PORT`：后端端口，默认 `3001`
- `HOST`：后端监听地址，默认 `0.0.0.0`
- `LOG_LEVEL`：Fastify 日志级别，默认 `info`

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

没有配置 DeepSeek API Key 时，系统会走保守回退结果，仍可完成本地提交和计分流程。

## 项目结构

```text
.
├── src/                 # Vue 前端
│   ├── admin/           # 管理后台页面和布局
│   ├── components/      # 前台组件
│   ├── composables/     # 前台状态和动作编排
│   ├── i18n/            # 简体中文和英文文案
│   ├── pages/           # 前台页面
│   ├── router/          # vue-router 路由
│   └── services/        # 前端服务封装
├── server/              # Fastify 后端
│   ├── ai/              # AI 裁判调用、解析和回退逻辑
│   ├── adminRoutes.ts   # 管理后台 API
│   ├── database.ts      # SQLite 初始化和数据访问
│   └── routes.ts        # 前台 API
├── shared/              # 前后端共享规则和类型
├── scripts/             # 工具脚本
├── data/                # 本地 SQLite 数据目录
└── prompts/             # Prompt 相关文件
```

## 前端路由

前台主要入口：

- `/`：摸鱼记录提交
- `/result`：本次得分结果
- `/leaderboard`：排行榜
- `/profile`：个人主页
- `/profile/wallet`：鱼鳞钱包
- `/users/:username`：公开用户页
- `/notifications`：通知中心，需要普通用户登录
- `/protection`：安全与内容保护
- `/community`：社区广场
- `/topics/:slug`：话题详情
- `/records/:id`：公开记录分享页
- `/guilds`、`/guilds/:id`：工会大厅和工会详情
- `/circles`、`/circles/:id`：圈子广场和圈子详情
- `/groups`、`/groups/:id`：我的小组和小组详情
- `/announcements`：公告
- `/checkin`：签到
- `/feedback`：反馈
- `/about`：关于

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
- `GET /api/community/feed`
- `GET /api/community/hot`
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

工会、圈子和小组：

- `GET /api/guilds`
- `GET /api/guilds/:id`
- `POST /api/guilds/:id/join`
- `GET /api/guilds/:id/ranking`
- `GET /api/guilds/:id/members`
- `GET /api/guilds/:id/tasks`
- `GET /api/circles`
- `GET /api/circles/:id`
- `POST /api/circles/:id/join`
- `GET /api/circles/:id/feed`
- `GET /api/circles/:id/ranking`
- `GET /api/groups/my`
- `POST /api/groups`
- `POST /api/groups/join-by-code`
- `GET /api/groups/:id`
- `GET /api/groups/:id/goals/current`
- `GET /api/groups/:id/feed`
- `GET /api/groups/:id/ranking`
- `POST /api/groups/:id/challenges`
- `POST /api/groups/:id/share-record`

管理后台接口统一在 `/api/admin` 下，覆盖管理员登录态、概览、审核队列、记录、举报、评论、用户、钱包、交易、话题、工会、圈子、小组、安全配置、AI Prompt、站点配置和操作日志。所有后台写操作必须写入 `admin_audit_logs`。

## 数据与安全原则

- SQLite 数据文件默认创建在 `data/gongwei-yuwang.sqlite`。
- 数据库结构变更必须幂等，不清空现有数据，不破坏旧状态字段。
- 客户端可以展示计分规则，但最终分数必须由后端根据提交内容和规则计算。
- 记录、评论、举报、用户、工会、圈子和小组状态字段需要兼容旧数据。
- 不提供图片、截图或文件上传。
- 不收集真实公司名、部门名、客户名、员工身份、真实地理位置等敏感身份信息。
- 手机号、邮箱、链接、疑似公司全称等内容应进入审核或被阻断。
- 管理员 token 不写入 `localStorage`，后台权限只信任 httpOnly cookie。

安全提示文案：

```text
请不要提交公司机密、个人隐私、员工证件、聊天记录、客户资料或未匿名化截图。
本平台仅供娱乐，不支持真实违反职场规则的行为。
```

## 验证

每完成一个功能点后至少运行：

```bash
npm run typecheck
npm run build
```

本地服务启动后建议检查：

```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/options
curl "http://localhost:3001/api/leaderboards?board=today"
curl http://localhost:3001/api/auth/me
curl http://localhost:3001/api/admin/auth/me
curl http://localhost:3001/api/admin/dashboard/summary
```

涉及前端页面时，还需要确认页面能正常加载，左侧导航切换后只展示对应功能区，窄屏下文字、按钮和底部统计不重叠。涉及登录、个人主页、互动或审核时，需要同时检查登录态和未登录态。管理后台不能由未登录管理员访问。

## 开发约定

- 保持轻量架构，除非已有明确需求，不引入微服务、消息队列、Redis、Elasticsearch、云存储或大型权限系统。
- 新增入口前先评估左侧导航高度和移动端布局，避免导航重复。
- 新增互动能力时同步考虑登录要求、排行榜影响、徽章影响、审核流程和个人主页刷新。
- 修改共享规则或接口类型时，同步更新前端类型、后端路由和相关验证。
- 后台审核和内容安全策略优先保守，不引导用户或管理员收集更多真实隐私。
