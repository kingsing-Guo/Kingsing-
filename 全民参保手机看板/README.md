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

## 手机同时访问两个系统（联通版 + 纯前端版）

前提：手机和电脑在同一 Wi-Fi；电脑局域网 IP 示例 `192.168.110.83`。

### 手动启动（3个终端）

终端A（联通版后端）：
```bash
cd "/Users/tonibao_1/Documents/New project"
git switch main
python3 backend/seed_db.py
python3 backend/server.py
```

终端B（联通版前端）：
```bash
cd "/Users/tonibao_1/Documents/New project"
python3 -m http.server 8080
```

终端C（纯前端演示版）：
```bash
cd "/Users/tonibao_1/Documents/纯前端演示版本"
python3 -m http.server 8090
```

手机访问地址：
- 联通版：`http://192.168.110.83:8080/login.html`
- 纯前端版：`http://192.168.110.83:8090/login.html`

联通版登录页点击“设置”，后端地址填：
- `http://192.168.110.83:8787`

### 一键启动（联通版前后端 + 纯前端版）
```bash
cd "/Users/tonibao_1/Documents/New project" && \
python3 backend/seed_db.py && \
(python3 backend/server.py > /tmp/dashboard_backend.log 2>&1 &) && \
(python3 -m http.server 8080 > /tmp/dashboard_frontend_main.log 2>&1 &) && \
(cd "/Users/tonibao_1/Documents/纯前端演示版本" && python3 -m http.server 8090 > /tmp/dashboard_frontend_demo.log 2>&1 &) && \
echo "联通版前端: http://192.168.110.83:8080/login.html" && \
echo "联通版后端: http://192.168.110.83:8787/api/health" && \
echo "纯前端演示版: http://192.168.110.83:8090/login.html"
```

### 一键停止
```bash
pkill -f "backend/server.py"; pkill -f "http.server 8080"; pkill -f "http.server 8090"
```

## 需求变更模板（先 Demo 后 Main）

适用目标：先在 `frontend-demo` 快速确认视觉/交互，再同步到 `main`，减少联通版反复改动风险。

### A. 一条需求的标准流程

1) 在纯前端版实现与确认  
```bash
cd "/Users/tonibao_1/Documents/New project"
git switch frontend-demo
```
- 完成 UI/交互改动
- 本地验证（手机 + PC）
- 提交（建议单需求单提交）

```bash
git add <files>
git commit -m "feat(demo): <需求简述>"
git push origin frontend-demo
```

2) 将已确认改动同步到联通版  
```bash
git switch main
git cherry-pick <demo提交SHA>
```
- 若冲突：以 `main` 的接口/权限/口径为准解决
- 解决后继续：
```bash
git add <resolved files>
git cherry-pick --continue
git push origin main
```

3) 联通版回归验证  
- 登录流程（四角色）
- 年度切换、权限范围、关键穿透
- 手机端布局与交互

### B. 提交信息规范（建议）
- Demo 分支：`feat(demo): ...` / `style(demo): ...`
- Main 分支：`feat(main): ...` / `fix(main): ...`

### C. 哪些需求先放 demo，哪些直接改 main

先放 `frontend-demo`：
- 版式、色彩、图标、文案、交互细节
- 手机端适配、动效、信息层级

直接改 `main`：
- 后端接口、权限控制、数据口径、穿透规则
- 与数据库/服务端强相关逻辑

### D. 每次合并前检查清单
- [ ] 功能与需求描述一致
- [ ] 不影响另一分支现有功能
- [ ] 提交粒度清晰（单需求单提交）
- [ ] 手机与PC都已自测

## 已配置 Skill（先 Demo 后 Main）

已创建并可复用的工作流 Skill：
- 名称：`demo-first-main-flow`
- 目录：`/Users/tonibao_1/.codex/skills/demo-first-main-flow`
- 说明文件：`/Users/tonibao_1/.codex/skills/demo-first-main-flow/SKILL.md`

用途：
- 先在 `frontend-demo` 做视觉与交互定稿
- 通过 `cherry-pick` 把确认后的改动同步到 `main`
- 降低联通版反复改动和误改风险

触发方式：
- 在需求中显式写：`$demo-first-main-flow`
- 或直接描述“先在演示版修改，确认后同步 main”的流程
