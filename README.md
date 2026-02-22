# 全民参保数智动员手机看板

本仓库包含：
- 前端看板：`/Users/tonibao_1/Documents/New project/index.html`
- 登录页：`/Users/tonibao_1/Documents/New project/login.html`
- 后端起步版：`/Users/tonibao_1/Documents/New project/backend`

## 后端快速启动
```bash
cd "/Users/tonibao_1/Documents/New project/backend"
python3 seed_db.py
python3 server.py
```

## 后端接口
- 健康检查：`GET /api/health`
- 登录：`POST /api/auth/login`
- 指标：`/api/metrics/core|age|staff|risk`
- 列表：`/api/list/residents`、`/api/list/enterprises`

详细见：`/Users/tonibao_1/Documents/New project/backend/README.md`
