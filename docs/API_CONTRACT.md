# API_CONTRACT.md

## 工会经营系统 v1 / 第一阶段

### `POST /api/guilds`

- 权限: 必须登录；被封禁用户由 `requireAuth` 返回 403；不需要管理员权限。
- 用途: 用户消耗 50 鱼鳞创建用户工会，并自动成为会长。
- Request body:

```json
{
  "name": "摸鱼地下研究所",
  "description": "专注研究如何在精神上准时下班。",
  "icon": "鱼"
}
```

- 校验: `name` trim 后 2-40 字符；`description` trim 后最多 180 字符；`icon` trim 后 1-4 字符；`name + description` 必须通过 `analyzeContentSafety`，`review` 或 `block` 都返回 400。
- 业务规则: 创建费用固定 50 鱼鳞；必须使用 `spendFishScale()`；扣费、创建 `guilds`、插入 `guild_members`、更新 `users.guild_id`、更新 `fish_scale_transactions.related_id` 在同一个事务内完成；每个用户最多拥有 1 个 `source='user' AND status!='banned'` 的工会。
- Response 201:

```json
{
  "guild": {},
  "wallet": {},
  "transaction": {},
  "message": "工会创建成功，会长已上任。"
}
```

- 错误码: 400 参数无效、安全不通过或鱼鳞不足；401 未登录；403 被封禁；409 已拥有用户工会或名称重复。
- 影响: 扣减鱼鳞钱包；新增鱼鳞流水 `reason='guild_creation_spend'`；更新用户工会状态和工会聚合；不直接修改排行榜规则、审核状态或系统设置。

### `PATCH /api/guilds/:id`

- 权限: 必须登录；仅 `guild_members.role='owner'` 可修改；普通用户不能修改 `source='official'` 工会；不需要管理员权限。
- 用途: 会长修改自己创建的用户工会资料。
- Request body: 可传 `name`、`description`、`icon`，至少一个字段。
- 校验: 字段长度同创建接口；`name + description` 必须通过 `analyzeContentSafety`；名称不能与其他工会重复。
- Response 200:

```json
{
  "guild": {},
  "message": "工会资料已更新。"
}
```

- 错误码: 400 参数无效或安全不通过；401 未登录；403 非 owner 或官方工会；404 工会不存在；409 名称重复。
- 影响: 更新 `guilds.updated_at`；不影响排行榜、用户状态、审核状态或系统设置。

### `POST /api/guilds/:id/leave`

- 权限: 必须登录；目标用户必须是该工会成员；owner 不能直接退出。
- Request body: 空对象。
- Response 200:

```json
{
  "ok": true,
  "message": "已退出工会。"
}
```

- 错误码: 400 owner 直接退出；401 未登录；403 非成员；404 工会不存在。
- 影响: 删除当前用户 `guild_members`；当 `users.guild_id` 指向该工会时置为 `NULL`；不修改历史 `slacking_records.guild_id`；刷新社交聚合。

### `POST /api/guilds/:id/members/:userId/remove`

- 权限: 必须登录；操作者必须是该工会 owner。
- Request body: 空对象。
- Response 200:

```json
{
  "ok": true,
  "message": "成员已移出工会。"
}
```

- 错误码: 400 踢自己或踢 owner；401 未登录；403 非 owner；404 工会或目标成员不存在。
- 影响: 删除目标用户 `guild_members`；当目标 `users.guild_id` 指向该工会时置为 `NULL`；不修改历史 `slacking_records.guild_id`；刷新社交聚合。

### `POST /api/guilds/:id/join`

- 权限: 必须登录；只能加入 `status='active'` 工会。
- 行为: 已在当前工会时直接返回当前工会；普通成员可切换工会并返回 `"已退出原工会并加入新工会。"`；owner 不能通过加入其他工会绕过退出限制。
- 错误码: 400 owner 直接切换；401 未登录；404 工会不存在或非 active。
- 影响: 更新会员关系、`users.guild_id`、历史无工会记录的 `guild_id` 和社交聚合；不修改系统设置。

### `GET /api/guilds` / `GET /api/guilds/:id`

- 公开接口只返回或访问 `status='active'` 工会；hidden、inactive、banned 工会在公开接口中等同不存在。
- `publicGuild` 字段新增: `ownerUserId`、`createdByUserId`、`source`、`joinPolicy`、`status`、`role`。
- `role` 仅当前登录用户是成员时返回成员角色，否则为空字符串。

### 管理后台工会接口

- `/api/admin/guilds` 继续返回全部工会，不按 status 过滤。
- 后台创建工会默认 `source='official'`、`join_policy='open'`、`status='active'`。
- 后台 status 接口支持 `active`、`inactive`、`hidden`、`banned`。
