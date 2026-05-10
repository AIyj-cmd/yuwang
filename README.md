# 工位鱼王 MVP

轻量娱乐社区工具：提交匿名摸鱼记录，后端按固定规则计算 Fish Power Score，写入 SQLite，并展示本次得分、称号、评论和排行榜。

## 运行

```bash
npm install
npm run dev
```

当前本地开发服务：

- 前端：`http://127.0.0.1:5174/`
- API：`http://localhost:3001`

如果直接使用 `npm run dev`，Vite 默认会尝试 `5173`，端口被占用时可执行：

```bash
npm run dev:client -- --port 5174 --strictPort
npm run dev:server
```

## 构建

```bash
npm run typecheck
npm run build
npm run start
```

## 主要接口

- `GET /api/options`：表单枚举、等级、敏感词和安全提示。
- `POST /api/records`：提交匿名摸鱼记录，后端计算分数并保存。
- `GET /api/leaderboards?board=today|week|disguise|meeting`：获取排行榜。
- `GET /api/stats`：获取基础统计。

## 数据

SQLite 文件会自动创建在 `data/gongwei-yuwang.sqlite`。MVP 没有账号系统，累计称号按昵称统计，仅作娱乐展示。
