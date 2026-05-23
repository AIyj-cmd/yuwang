# DATABASE_SCHEMA.md

## guilds

第一阶段补齐用户工会经营字段，迁移在 `server/database.ts` 中通过 `addColumnIfMissing` 幂等执行。

| 字段 | 类型 | 允许为空 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `owner_user_id` | INTEGER | 是 | `NULL` | 用户工会会长用户 ID；官方工会可为空 |
| `created_by_user_id` | INTEGER | 是 | `NULL` | 创建者用户 ID；官方 seed 可为空 |
| `source` | TEXT | 否 | `official` | `official` 或 `user` |
| `join_policy` | TEXT | 否 | `open` | 第一阶段只实现 `open` |
| `status` | TEXT | 否 | `active` | `active`、`inactive`、`hidden`、`banned` |
| `updated_at` | TEXT | 否 | `''` | 修改资料或状态时更新 |

索引:

- `idx_guilds_owner_user_id ON guilds(owner_user_id)`
- `idx_guilds_source ON guilds(source)`
- `idx_guilds_status ON guilds(status)`

约束和兼容:

- `guilds.name` 和 `guilds.slug` 保持唯一约束。
- 新增外键关系: `owner_user_id -> users(id)`，`created_by_user_id -> users(id)`。
- 删除策略: 不级联删除用户或历史工会数据；管理员停用/隐藏/封禁通过 `status` 控制。
- 迁移方式: 仅补列和补索引，不清空旧数据。
- 旧数据兼容: 历史官方工会 `source` 默认 `official`，`join_policy` 默认 `open`，`status` 默认 `active`，空 `updated_at` 回填 `created_at`。

## guild_members

- 创建用户工会时插入 `role='owner'` 的创建者成员记录。
- 用户退出或 owner 移除成员时删除对应成员记录。
- `user_id` 继续保持唯一，保证普通用户同一时间只属于一个工会。

## users

- 创建、加入、退出、移除成员会同步维护 `users.guild_id`。
- 退出和移除成员只在 `users.guild_id` 指向该工会时置空。

## fish_scale_transactions

- 创建用户工会必须产生 `amount=-50`、`type='spend'`、`reason='guild_creation_spend'`、`related_type='guild'` 的流水。
- 流水先由 `spendFishScale()` 在事务内创建，再在同一事务内将 `related_id` 更新为新工会 ID。
