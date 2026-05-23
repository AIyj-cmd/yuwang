# BACKEND_TASKS.md

## 工会经营系统 v1 / 第一阶段

- [x] 在 `server/database.ts` 补齐 `guilds` 用户工会字段兼容迁移。
- [x] 新增 `guilds` owner、source、status 索引。
- [x] 实现 `POST /api/guilds`，在同一事务内完成扣鱼鳞、建工会、写成员、同步用户和回填流水 related_id。
- [x] 实现 `PATCH /api/guilds/:id`，仅允许用户工会 owner 修改资料。
- [x] 实现 `POST /api/guilds/:id/leave`，普通成员可退出，owner 不能直接退出。
- [x] 实现 `POST /api/guilds/:id/members/:userId/remove`，owner 可移出普通成员。
- [x] 加强 `POST /api/guilds/:id/join`，只允许加入 active 工会，普通成员可切换，owner 不能绕过退出限制。
- [x] 收紧公开工会列表、详情、排行、成员和任务接口，只暴露 active 工会。
- [x] 扩展 `publicGuild` 返回 owner/source/joinPolicy/status/role。
- [x] 保持 `/api/admin/guilds` 返回全部工会，后台创建默认为 official。
- [x] 更新接口、数据库、权限和验收文档。

未做事项:

- 未实现工会公告、动态、徽章、任务、招募令。
- 未引入新依赖、队列、Redis 或复杂权限系统。
- 未修改前端页面、组件、样式、布局或路由页面。
