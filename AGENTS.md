# 工位鱼王开发规范

> 本文件是 AI 协作者执行任务前必须阅读的项目规则。  
> 适用对象：Claude Code、Codex、Kimi/Mimi、DeepSeek、Hermes 以及人工维护者。  
> 当前阶段：前端 V2 统一、接口契约稳定、后端可维护性治理。

---

## 0. 当前阶段

工位鱼王已经进入持续运营、体验打磨与前端 V2 统一阶段。当前重点不是继续堆新功能，而是：

1. 稳定既有核心闭环。
2. 统一前端视觉和组件系统。
3. 让 Community Home V2 成为新前端基准。
4. 保持后端接口契约清晰。
5. 建立问题审查和 PR 质量门槛。
6. 后续为 SQLite → PostgreSQL 迁移做数据库访问层准备。

已经具备的核心能力：

- 摸鱼记录提交、后端计算 0-10 单条 Fish Power Score、SQLite 持久化、结果展示。
- 今日、周榜、月榜、赛季榜、伪装榜、会议榜、传奇榜。
- 用户注册登录、个人主页、累计等级称号、徽章和成就。
- 评论互动、点赞、收藏、投票、分享卡片。
- 社区广场、工会大厅、圈子广场、我的小组。
- 管理后台、人工审核、举报处理、评论管理、用户状态管理、运营配置、敏感词配置和管理员操作日志。
- 基础内容安全策略，包括敏感词、长度限制、匿名化确认、疑似隐私内容审核。
- 简体中文和英文界面切换。

---

## 1. 产品定位

工位鱼王是一个轻松、荒诞、偏娱乐化的社区网站。用户提交的是匿名化的“摸鱼记录”和办公精神状态，系统按后端规则计算 Fish Power Score，并生成称号、评论、排行榜和成就。

核心边界：

- 这是娱乐社区，不鼓励用户真实违反职场规则。
- 文案可以幽默，但不能鼓励破坏工作秩序、泄露资料或规避管理。
- 不引导用户上传公司机密、个人隐私、员工证件、聊天记录、客户信息、截图或任何未匿名化资料。
- 不收集真实公司名、部门名、客户名、员工身份、真实地理位置等敏感身份信息。
- 匿名记录在公共社区里不能暴露真实 userId、username、email 或 reviewNote。

---

## 2. AI 协作分工

### ChatGPT

负责需求拆解、后端规则、API 契约、数据库约束、权限边界、验收标准、Codex/Claude 执行 prompt、PR 前审查策略。

每个新功能默认按以下维度拆：

```text
产品目标
后端约束
数据库约束
权限边界
触发时机
验收标准
反模式
```

### Codex

负责后端逻辑、API、数据库迁移、权限校验、后端安全修复、后端文档、后端自查。

Codex 禁止：

- 顺手大改前端视觉。
- 修改 `src/`，除非当前任务明确允许。
- 为了页面效果发明前端 mock。
- 绕过 API_CONTRACT。
- 在没有用户确认时改 package.json / lockfile。

### Claude Code

负责前端页面、前端视觉、Vue 组件、响应式布局、真实 API 接入、前端局部交互。

Claude 禁止：

- 修改 `server/`。
- 修改 `shared/` 中业务规则。
- 修改数据库结构。
- 修改后端 API 契约。
- 发明不存在的接口。
- 用 mock 数据冒充真实功能。
- 为了视觉修改权限、评分、举报、钱包、管理员鉴权等后端逻辑。

### Kimi/Mimi

负责视觉探索、参考页面、多方向设计稿，不修改真实项目代码。

创意阶段可以开放；工程实现阶段必须强约束。

---

## 3. 技术栈

前端：

- Vue 3
- Vite
- TypeScript
- vue-router
- 图标：`lucide-vue-next`
- 历史依赖：`@mmt817/pixel-ui`

Pixel UI 规则：

- Pixel UI 是历史依赖。
- 旧页面可暂时继续使用。
- Community V2 和后续新页面不再新增 Pixel UI 组件。
- 不要为了卸载 Pixel UI 一次性大范围重构。
- 确认无引用、typecheck/build 通过后，才能单独提出卸载建议。

后端：

- Node.js
- Fastify
- SQLite

架构原则：

- 当前阶段仍保持轻量架构。
- 不引入微服务、消息队列、Redis、Elasticsearch、云存储或大型权限系统，除非用户明确要求并且已有实际需求。
- 数据库当前继续使用 SQLite；未来先做 repository / data access 层治理，再考虑 PostgreSQL 迁移。

---

## 4. 前端 V2 规则

### 4.1 视觉真理来源

任何前端视觉任务必须先读：

- `STYLE_GUIDE.md`
- `CLAUDE_FRONTEND_PROMPT.md`
- 当前任务提示词

Community Home V2 还必须读：

- `docs/API_CONTRACT.md`
- `docs/COMMUNITY_V2_DATA_MAP.md`
- `drafts/community-neopixel-v3.html`

### 4.2 Neo-pixel Flat

当前视觉方向：

```text
Neo-pixel Flat = 80% 现代扁平 + 20% 像素点缀
```

要求：奶油白背景、柔和卡片、低饱和颜色、像素图标点缀、充分留白、轻游戏化。

禁止：

- 大面积黑色硬边框。
- 顶部粗黑横线。
- 卡片粗黑外框。
- 输入框黑色粗描边。
- 右栏卡片黑色描边。
- 左侧导航黑色工具条。
- 过重黑色按钮。
- 整段像素字体。
- 高饱和荧光色。
- 把所有容器都做成黑线框。

黑色或深色边框只允许极少量用于小面积像素点缀，不允许作为默认容器边界。

### 4.3 Community V2 当前状态

Community V2 已具备：

- `/community` 路由。
- `GET /api/community/overview`。
- `GET /api/community/feed?filter=latest|hot|high|legendary`。
- `fishPowerScore`、`primaryTag`、`avatarSeed`、`avatarUrl`。
- `viewer.favorited`、`viewer.reported`。
- `featureFlags.mutualFollowing/topics/profilePages = false`。
- `viewer.reported` 只表示 `pending/reviewing` active report。
- 匿名 feed 不返回真实 userId、username、email、reviewNote。

Claude 做 Community V2 时必须使用真实接口，不得 mock。

### 4.4 未开放功能

当前不开发：

- 互相关注真实筛选。
- 话题 `#` 系统。
- 用户个人主页新流程。
- 动态详情页。
- 工会 / 圈子 / 小组详情页重做。
- 搜索弹窗完整实现。

未开放能力应显示为待开放、disabled、安全空状态，不请求不存在 API。

---

## 5. 当前信息架构

当前前台同时存在：

- 全局顶部导航。
- Community V2 页内左侧 SideNav。
- 主内容栏。
- 右栏数据区。

不要把旧阶段“左侧导航栏是唯一主要入口”的规则当成绝对约束。

导航原则：

- Community V2 以 `STYLE_GUIDE.md` 和 `docs/COMMUNITY_V2_DATA_MAP.md` 为准。
- 新增入口前先评估导航重复、移动端布局和信息层级。
- 未完成的入口不要做成真实功能。
- 管理后台不暴露给普通导航；前台入口只允许当前用户为 admin 时显示。

---

## 6. 管理后台

管理后台统一在 `/admin` 下，和普通前台布局分离。

后台访问保护：

- 所有 `/admin` 页面除 `/admin/login` 外必须先调用 `/api/admin/auth/me` 验证。
- 所有 `/api/admin` 接口必须由后端验证管理员 httpOnly cookie + server-side admin session。
- 管理员 token 不得存入 `localStorage`。
- 普通用户 token 不能作为后台权限。
- 管理员密码不能硬编码，必须通过环境变量提供。
- 所有后台写操作必须写入 `admin_audit_logs`。
- 管理员 session 数据库错误不能伪装成 401 未登录。
- 不要在日志中输出敏感 token 内容。

管理员环境变量：

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`

生成密码哈希：

```bash
npm run admin:hash-password -- your-password
```

---

## 7. 核心业务规则

### 7.1 记录提交表单

表单保持轻量。

核心字段：昵称或账号显示名、摸鱼内容、持续时间、描述 / story text、发布范围、匿名化确认。

不提供图片、截图或文件上传。

当前前端方向：

- 速记提交可以只显示一个主输入框。
- 但提交 payload 必须满足后端 `activityText` 和 `description` / `storyText` 非空契约。
- 不再在提交弹窗里显示“自动进入相关圈子”入口。
- 不再在摸鱼时间选项中直接展示具体分数。

### 7.2 Fish Power Score

当前评分规则：

- 单条 `fishPowerScore` 是后端生成的 0-10 分。
- 分数可保留 1 位小数。
- AI judge success path 和 deterministic fallback 都必须 clamp 到 `[0, 10]`。
- 入库前必须二次 clamp。
- 数据库 trigger 防止越界写入。
- 客户端可以展示结果，但不能决定最终分数。
- 客户端提交的 `fishPowerScore`、`score`、`totalScore`、`title` 不可信。

用户累计分：

- `users.total_score` / `cumulativeScore` 是累计成长值。
- 累计分不 capped 到 10。
- 鱼鳞、钱包、互动奖励、工会贡献不是单条评分，不 capped 到 10。

禁止继续使用旧公式作为实现依据：

```text
摸鱼类型基础分 * 持续时间倍率 * 风险倍率 + 伪装加分 + 创意加分
```

如旧注释仍存在，应按 0-10 新语义更新。

### 7.3 排行榜

排行榜可以聚合多条 0-10 单条分，因此榜单分数可以超过 10。

### 7.4 举报规则

- 同一用户对同一目标只能有一个 active report。
- active statuses: `pending`、`reviewing`。
- 已处理状态不阻止未来再次举报。
- 重复 active 举报应返回 `alreadyReported: true`，不重复计数，不创建重复审核任务。

### 7.5 社交链路

社交链路按四类入口维护：社区、工会、圈子、小组。

当前提交弹窗不再展示“自动进入相关圈子”入口。

如未来要恢复圈子自动归属，必须单独进行产品确认、后端契约、数据库约束、权限边界和前端验收。

---

## 8. 审核和安全

安全提示必须持续可见或可到达：

```text
请不要提交公司机密、个人隐私、员工证件、聊天记录、客户资料或未匿名化截图。
本平台仅供娱乐，不支持真实违反职场规则的行为。
```

内容保护至少包括：描述长度限制、明显敏感词拦截、手机号/邮箱/链接/疑似公司全称进入审核、匿名化确认必选、后端重新计算分数。

内容审核要优先保守。任何疑似公司机密、隐私、证件、客户资料、聊天记录或截图内容都不能直接公开。

---

## 9. 数据库原则

- SQLite 结构变更必须幂等。
- 已存在字段不要重复添加导致报错。
- 不要清空现有数据。
- 不要改坏现有排行榜和提交记录功能。
- 状态字段必须兼容旧数据。
- 管理后台写操作必须写 `admin_audit_logs`。
- 当前阶段不直接迁移 PostgreSQL。
- 未来先做数据库访问层治理：收敛 SQL、抽 repository、隔离 SQLite 专属语法，再评估 PostgreSQL adapter。

SQLite 专属语法如 `INSERT OR IGNORE`、`last_insert_rowid()`、`datetime('now')`、trigger、partial index、`?` placeholder 等应逐步集中管理，不要继续散落在业务逻辑里。

---

## 10. 开发原则

- 保持功能可用优先，避免为小需求引入重型依赖。
- 不要在一个任务里同时改前端、后端、数据库和文档，除非任务明确要求。
- 每个导航入口应只展示对应功能，避免所有内容堆在一个页面。
- 合并同类功能，减少导航重复项。
- 前端布局要像社区产品，不做营销落地页。
- 第一屏直接展示可操作产品。
- 响应式布局必须避免文字和控件重叠。
- 数据写入、互动、审核和排行榜刷新要保持前后端状态一致。
- 不要破坏已有用户数据，SQLite 结构变更要用兼容迁移。
- 修改共享规则或接口类型时，同步更新前端类型、后端路由和相关验证。

---

## 11. 验证要求

每完成一个功能点都要跑验证，再进入下一个功能点。

基础验证命令：

```bash
npm run typecheck
npm run build
```

本地运行检查：

- `GET /api/health`
- `GET /api/options`
- `GET /api/leaderboards`
- `GET /api/community/overview`
- `GET /api/community/feed?filter=latest`
- `GET /api/auth/me`
- `GET /api/admin/auth/me`
- `GET /api/admin/dashboard/summary`

前端改动必须至少验证页面能正常加载、当前路由与导航状态一致、移动端无横向溢出、登录态和未登录态都可用、管理后台不能由未登录管理员访问。

---

## 12. 暂缓事项

除非用户明确要求，继续暂缓：付费功能、AI 自动审核、WebSocket 实时排行榜、复杂权限系统、云存储和文件上传、真实身份信息采集、微服务拆分和消息队列、互相关注真实功能、话题系统完整开发、用户主页新流程、动态详情页、数据库直接迁移 PostgreSQL。

---

## 13. Command Output

保护上下文。任何未知或可能很大的命令输出必须截断。

默认模式：

```bash
COMMAND 2>&1 | head -c 4000
```

PowerShell 可使用：

```powershell
COMMAND 2>&1 | Select-Object -First 80
```
