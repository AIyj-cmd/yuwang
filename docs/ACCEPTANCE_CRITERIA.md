# ACCEPTANCE_CRITERIA.md

## 工会经营系统 v1 / 第一阶段

- [x] `npm run typecheck` 通过。
- [x] `npm run build` 通过。
- [x] 使用隔离 SQLite 工作目录完成 Fastify inject 烟测，覆盖创建、扣费、权限、退出/移除、公开过滤和后台全量可见。
- [x] `POST /api/guilds` 要求登录，余额不足返回 `鱼鳞不足，今天再摸一会儿？`，事务回滚且不新增 guild。
- [x] 用户余额 >= 50 时创建成功，返回 `guild`、`wallet`、`transaction` 和 `"工会创建成功，会长已上任。"`。
- [x] 创建成功后 `user_wallets.fish_scale_balance` 减少 50。
- [x] 创建成功后 `fish_scale_transactions.amount=-50`、`reason='guild_creation_spend'`、`related_type='guild'`、`related_id=新工会 ID`。
- [x] 创建成功后 `guilds.source='user'`、`owner_user_id=当前用户 ID`、`created_by_user_id=当前用户 ID`、`join_policy='open'`、`status='active'`。
- [x] 创建成功后 `guild_members.role='owner'`，`users.guild_id=新工会 ID`。
- [x] 每个用户最多拥有 1 个 `source='user' AND status!='banned'` 的工会，重复创建返回 409。
- [x] 工会名称重复返回 409。
- [x] 工会名称或描述包含疑似敏感内容时返回 400。
- [x] 非 owner 修改工会返回 403。
- [x] 普通用户修改官方工会返回 403。
- [x] owner 可以修改自己创建的用户工会，更新 `updated_at`。
- [x] 普通成员可以退出工会，且不修改历史 `slacking_records.guild_id`。
- [x] owner 不能直接退出工会。
- [x] owner 可以踢出普通成员。
- [x] owner 不能踢自己，不能踢 owner。
- [x] `GET /api/guilds` 不返回 hidden、banned、inactive 工会。
- [x] `GET /api/guilds/:id` 对 hidden、banned、inactive 工会返回 404。
- [x] `GET /api/admin/guilds` 仍返回全部工会。
- [x] 未修改前端页面、组件、样式、布局或路由页面。
