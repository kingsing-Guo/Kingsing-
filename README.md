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

## 双版本并行开发（推荐流程）

当前仓库采用双分支并行：
- `main`：最新前后端联通版（含 `backend`）
- `frontend-demo`：纯前端高保真演示版（固定基线：`751928c`）

### 1) 切换到联通版开发（main）
```bash
cd "/Users/tonibao_1/Documents/New project"
git switch main
```

本地启动（联通版）：
```bash
# 终端1
cd "/Users/tonibao_1/Documents/New project"
python3 backend/seed_db.py
python3 backend/server.py

# 终端2
cd "/Users/tonibao_1/Documents/New project"
python3 -m http.server 8080
```

### 2) 切换到纯前端演示版开发（frontend-demo）
```bash
cd "/Users/tonibao_1/Documents/New project"
git switch frontend-demo
python3 -m http.server 8090
```

### 3) 选择性同步改动（cherry-pick）
当某个改动要同时给两个版本使用时：

```bash
# 例：把 main 上某个提交同步到 frontend-demo
git switch frontend-demo
git cherry-pick <main上的提交SHA>

# 反向同步同理
git switch main
git cherry-pick <frontend-demo上的提交SHA>
```

### 4) 推送两个分支
```bash
git push origin main
git push origin frontend-demo
```
