# 工位鱼王

工位鱼王是一个轻量、荒诞、偏娱乐化的社区网站。用户提交匿名化的“摸鱼记录”和办公精神状态，系统在后端按固定规则计算 Fish Power Score，并围绕记录生成称号、评论、排行榜、徽章、社交互动和管理审核流程。

项目当前处于后 MVP 阶段：核心提交、计分、排行、社区、账号、内容安全和管理后台已经具备，后续开发优先保持现有功能稳定，再做增量迭代。

## 功能概览

- 摸鱼记录提交：支持昵称或账号显示名、摸鱼类型、持续时间、风险场景、伪装方式、创意描述、发布范围和匿名化确认。
- 得分结果：后端计算 Fish Power Score，展示本次得分、称号、今日排名、系统评论、互动入口和分享卡片。
- 排行榜：今日、周榜、月榜、赛季榜、伪装榜、会议榜和传奇榜，支持榜单切换与昵称筛选。
- 账号与个人主页：注册登录、资料编辑、累计等级称号、徽章、近期记录和鱼鳞钱包。
- 社区互动：社区广场、话题详情、点赞、收藏、投票、评论、举报、传奇提名和分享卡片。
- 社交链路：工会大厅、圈子广场、我的小组、邀请码小组、小组挑战和贡献排行。
- 安全与内容保护：敏感词、长度限制、疑似隐私内容审核、匿名化确认和持续安全提示。
- 管理后台：记录审核、举报处理、评论管理、用户状态、钱包调整、话题、工会、圈子、小组、安全配置、站点配置和操作日志。
- 界面语言：支持简体中文和英文界面切换。

## 技术栈

- 前端：Vue 3、Vite、TypeScript、vue-router、`@mmt817/pixel-ui`、`lucide-vue-next`
- 后端：Node.js、Fastify、SQLite `node:sqlite`
- 共享规则：评分规则、排行榜类型、称号、徽章和安全提示集中维护在 `shared/scoring.ts`

建议使用 Node.js 24 或更新版本运行项目，当前代码依赖内置 `node:sqlite`。

## 快速开始

```bash
npm install
npm run dev
```

开发服务：

- 前端：Vite 默认 `http://127.0.0.1:5173/`
- API：默认 `http://localhost:3001`

如果前端端口被占用，可以单独指定端口：

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

管理员登录页位于 `/admin/login`。除 `/admin/login` 外，所有 `/admin` 页面都会先请求 `/api/admin/auth/me` 验证管理员 httpOnly cookie。

## 页面路由

前台主要入口：

- `/`：摸鱼记录提交
- `/result`：本次得分结果
- `/leaderboard`：排行榜
- `/profile`、`/profile/wallet`：个人主页和鱼鳞钱包
- `/protection`：安全与内容保护
- `/community`、`/topics/:slug`：社区广场和话题详情
- `/guilds`、`/guilds/:id`：工会大厅和工会详情
- `/circles`、`/circles/:id`：圈子广场和圈子详情
- `/groups`、`/groups/:id`：我的小组和小组详情
- `/announcements`、`/checkin`、`/feedback`、`/about`

后台入口：

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
- `/admin/settings`
- `/admin/audit-logs`

## API 概览

基础接口：

- `GET /api/health`
- `GET /api/options`
- `GET /api/stats`
- `GET /api/announcements`
- `POST /api/suggestions`

账号与个人能力：

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PATCH /api/auth/me`
- `GET /api/users/:username`
- `GET /api/wallet/me`
- `GET /api/wallet/transactions`
- `GET /api/checkins/me`
- `POST /api/checkins`

记录、排行和社区：

- `POST /api/records`
- `GET /api/leaderboards?board=today|week|month|season|disguise|meeting|legendary`
- `GET /api/community/feed`
- `GET /api/community/hot`
- `GET /api/topics/popular`
- `GET /api/topics/:slug`
- `GET /api/records/:id/social`
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
- `GET /api/groups/:id/feed`
- `GET /api/groups/:id/ranking`
- `POST /api/groups/:id/challenges`
- `POST /api/groups/:id/share-record`

管理后台接口统一在 `/api/admin` 下，覆盖登录态、数据概览、记录、举报、评论、用户、钱包、交易、话题、工会、圈子、小组、安全配置、站点配置和操作日志。所有后台写操作都应写入 `admin_audit_logs`。

## 数据与安全规则

- SQLite 数据文件会自动创建在 `data/gongwei-yuwang.sqlite`。
- 数据库结构变更必须幂等，使用 `CREATE TABLE IF NOT EXISTS` 和缺失字段补齐方式，不能清空现有数据。
- 客户端可以展示评分规则，但最终分数必须由后端根据枚举值计算，不能信任客户端提交的分数。
- 记录、评论、举报、用户、工会、圈子和小组的状态字段需要兼容旧数据。
- 不提供图片、截图或文件上传。
- 不收集真实公司名、部门名、客户名、员工身份、真实地理位置等敏感身份信息。

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
curl http://localhost:3001/api/admin/auth/me
curl http://localhost:3001/api/admin/dashboard/summary
```

涉及前端页面时，还需要确认页面可正常加载、左侧导航切换只展示对应功能区、窄屏下文字和按钮不重叠。涉及登录、个人主页、互动或审核时，需要同时检查登录态和未登录态。管理后台页面不能由未登录管理员访问。
