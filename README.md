# 工位鱼王

工位鱼王是一个轻量、荒诞、偏娱乐化的社区网站。用户提交匿名化的“摸鱼记录”和办公精神状态，系统在后端按固定规则计算 Fish Power Score，并围绕记录生成称号、评论、排行榜、徽章、社交互动和管理审核流程。

项目当前处于后 MVP 阶段：核心提交、计分、排行、社区、账号、内容安全和管理后台已经具备，后续开发优先保持现有功能稳定，再做增量迭代。

## 功能概览

- 摸鱼记录提交：支持昵称或账号显示名、摸鱼类型、持续时间、风险场景、伪装方式、创意描述、发布范围和匿名化确认。
- 得分结果：后端计算 Fish Power Score，展示本次得分、称号、今日排名、系统评论、互动入口和分享卡片。
- 排行榜：今日、周榜、月榜、赛季榜、伪装榜、会议榜和传奇榜，支持榜单切换与昵称筛选。
- 账号与个人主页：注册登录、资料编辑、累计等级称号、徽章、近期记录和鱼鳞钱包。
- 社区互动：社区广场、话题详情、点赞、收藏、投票、评论、举报、传奇提名和分享卡片。
- 通知中心：站内通知覆盖点赞、评论、传奇提名、鱼鳞到账和记录审核状态，使用统一写入入口和 dedupe key 避免重复刷屏。
- 搜索与内容发现：社区页提供全站轻量搜索，按记录、话题、用户、工会、圈子和公开小组分组展示；话题详情支持最新、热门、高分、传奇筛选；记录社交详情展示相关记录推荐。
- 分享卡增强：分享卡展示标题、Fish Power Score、称号、系统点评、今日实时排名或历史高光、话题标签和匿名安全提示，支持生成分享卡、复制文案和复制公开分享链接。
- 个人摸鱼画像：个人主页和公开用户页展示总次数、累计分、平均分、常用类型、常用伪装、最高分记录、本周 / 本月活跃和互动汇总，并用确定性规则生成摸鱼人格标签。
- 小组周目标：小组详情展示当前周协作目标、进度、成员贡献和完成状态；记录提交或同步到小组后同步检查目标完成，并通过通知中心给成员发送完成通知。
- 社交链路：工会大厅、圈子广场、我的小组、邀请码小组、小组挑战和贡献排行。
- 安全与内容保护：敏感词、长度限制、疑似隐私内容审核、匿名化确认和持续安全提示。
- 管理后台：记录审核、举报处理、评论管理、用户状态、钱包调整、话题、工会、圈子、小组、安全配置、站点配置和操作日志。
- 界面语言：支持简体中文和英文界面切换。

## 技术栈

- 前端：Vue 3、Vite、TypeScript、vue-router、`@mmt817/pixel-ui`、`lucide-vue-next`
- 后端：Node.js、Fastify、SQLite `node:sqlite`
- 共享规则：评分规则、排行榜类型、称号、徽章和安全提示集中维护在 `shared/scoring.ts`

建议使用 Node.js 24 或更新版本运行项目，当前代码依赖内置 `node:sqlite`。

## 前端结构说明

`src/App.vue` 现在只承担应用壳层职责：顶部导航、本地菜单 UI 状态、`RouterView`、全局上下文 provide 和启动编排接线。全局业务逻辑按职责拆分到以下文件：

- `src/i18n/messages.ts`：集中维护简体中文 / 英文翻译字典，以及选项、称号、徽章、工会、圈子、公告和系统评论的英文映射。
- `src/i18n/useLocale.ts`：封装 `locale`、`setLocale`、`t`、`copy`、语言 localStorage 持久化和翻译辅助函数，不引入 `vue-i18n`。
- `src/composables/useAppState.ts`：集中维护 App 级 ref / reactive 状态、表单状态、computed 派生值和非 API 的轻量工具函数。
- `src/composables/useAppActions.ts`：集中维护调用 `src/api.ts` 的前端动作编排，包括登录、注册、登出、提交记录、排行榜、社区 feed、互动、工会、圈子、小组、钱包、签到和反馈等流程。
- `src/composables/useAppProvider.ts`：集中生成 `appContextKey` 的 provide 对象，保持子页面 `useAppContext()` 注入方式不变。
- `src/composables/useAppBootstrap.ts`：集中维护 App 启动时初始化请求，以及排行榜、社区筛选和路由 section 变化时的刷新触发。

维护约定：

- 修改翻译文案优先更新 `src/i18n/messages.ts`，修改语言读写行为优先更新 `src/i18n/useLocale.ts`。
- 修改全局状态或 computed 优先更新 `src/composables/useAppState.ts`，修改 API 编排优先更新 `src/composables/useAppActions.ts`。
- 新增需要子页面注入的上下文时，同步更新 `src/composables/useAppProvider.ts`，避免把 provide 对象重新堆回 `App.vue`。
- 前端结构调整不应改变 `src/api.ts` 请求路径、普通用户 token 登录方式、管理后台 httpOnly cookie session 或路由守卫行为。

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
- `/users/:username`：公开个人主页，只展示已公开且审核通过的记录
- `/notifications`：通知中心，页面文件为 `src/pages/NotificationsPage.vue`
- `/protection`：安全与内容保护
- `/community`、`/topics/:slug`：社区广场和话题详情
- `/records/:id`：公开分享落地页，只允许访问公开且审核通过的记录
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
- `GET /api/users/:username/insights`
- `GET /api/wallet/me`
- `GET /api/wallet/transactions`
- `GET /api/checkins/me`
- `POST /api/checkins`
- `GET /api/notifications`
- `GET /api/notifications/unread-count`
- `POST /api/notifications/:id/read`
- `POST /api/notifications/read-all`

记录、排行和社区：

- `POST /api/records`
- `GET /api/leaderboards?board=today|week|month|season|disguise|meeting|legendary`
- `GET /api/community/feed`
- `GET /api/community/hot`
- `GET /api/search?q=关键词`
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
- `POST /api/records/:id/share-card`，body 可传 `action=generate|copy_text|share_link`

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

管理后台接口统一在 `/api/admin` 下，覆盖登录态、数据概览、记录、举报、评论、用户、钱包、交易、话题、工会、圈子、小组、安全配置、站点配置和操作日志。所有后台写操作都应写入 `admin_audit_logs`。

## 数据与安全规则

- SQLite 数据文件会自动创建在 `data/gongwei-yuwang.sqlite`。
- 数据库结构变更必须幂等，使用 `CREATE TABLE IF NOT EXISTS` 和缺失字段补齐方式，不能清空现有数据。
- 客户端可以展示评分规则，但最终分数必须由后端根据枚举值计算，不能信任客户端提交的分数。
- 记录、评论、举报、用户、工会、圈子和小组的状态字段需要兼容旧数据。
- 通知系统只通过统一入口函数写入，互动、奖励、审核通知必须提供非空 `dedupe_key`；同一行为只通知一次，取消点赞后再次点赞不会重复通知。
- 小组目标完成通知预留 `group_goal_completed` 类型，并在小组目标功能中接入同一个通知入口。
- 搜索空查询返回空结果集合，不返回全站数据；搜索记录结果只展示 `approved` 且 `public` 的内容。
- 用户搜索结果只返回用户名、显示名、头像种子、公开简介、累计分数和公开称号，不返回账号状态、管理员字段、密码或会话信息。
- 当前搜索使用 SQLite `LIKE '%keyword%'` 的轻量实现，并限制每类结果数量，适合 MVP / 小规模数据；数据量增长后建议升级 SQLite FTS5 或外部搜索服务。
- 分享卡今日排名只对当天记录展示，且在请求时实时调用排行榜同源排名逻辑计算，不写入数据库快照，排名可能随当天新记录变化。
- 历史记录分享卡不显示今日排名，只展示记录创建日期、当时得分和历史高光文案。
- 分享卡不支持图片上传、截图上传或文件上传；只有明确生成、复制文案或复制链接动作会增加 `share_count`，页面刷新和 GET 读取不会增加分享次数。
- 个人摸鱼画像接口是公开接口，不需要登录；统计只基于该用户 `approved` 且 `public` 的记录，自己查看也不包含私密记录，不返回管理字段、账号状态字段或私密记录相关字段。
- 小组周目标第一版使用 `getWeekRange` 的当前周口径，部署环境按 Asia/Shanghai 本地时间运行；`period_key` 使用 `YYYY-MM-DD_YYYY-MM-DD` 起止日期格式。
- 小组周目标完成判定在记录提交、记录同步到小组或待审核记录通过时同步检查，只检查相关小组和当前周期 active 目标，不依赖 cron、后台 worker 或 WebSocket。
- 小组目标展示进度和完成判定共用 `getGroupGoalProgress`；完成通知通过通知统一入口写入，dedupe key 为 `group_goal_completed:{groupId}:{goalId}:{periodKey}`，不会重复发送。
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

通知中心新增后需要额外检查：未登录态不能读取通知；登录后能看到未读数量；点赞、评论、传奇提名、鱼鳞到账和审核状态变化能产生通知；同一行为不会重复通知；标记已读和全部已读会让未读数下降。

搜索与内容发现新增后需要额外检查：空关键词只返回空数组；搜索不会展示 private、hidden 或 rejected 记录；用户搜索不会返回管理字段；话题页四种筛选可切换；记录社交详情能展示相关记录且不包含当前记录。

分享卡增强后需要额外检查：提交结果页和社区记录能生成分享卡；复制文案和分享链接会增加分享次数；当天记录显示实时今日排名提示；历史记录不显示今日排名；未登录用户能打开公开分享页；私密、隐藏、拒绝记录不可公开访问。

个人摸鱼画像新增后需要额外检查：有公开记录用户能看到完整画像；无公开记录用户看到空状态；画像统计只来自公开且审核通过的记录；刷新后数据一致；公开用户页不泄露私密、隐藏、拒绝记录。

小组周目标新增后需要额外检查：小组详情能看到周目标和进度；提交或同步本周公开审核通过记录后进度变化；达标后状态变为 completed；小组成员收到且只收到一次目标完成通知；新一周使用新的 period key；老的小组、邀请码加入和小组 feed 不受影响。
