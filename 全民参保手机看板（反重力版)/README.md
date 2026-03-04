# 全民参保数智动员手机看板（反重力版）

面向移动端的全民参保动员数据看板，支持区/镇街/村居/网格四级权限查看，涵盖居民参保、企业参保、重点人群、存量分析等核心模块。

---

## 项目结构

```
├── index.html          # 主看板页面
├── login.html          # 登录页
├── css/
│   ├── dashboard.css   # 看板样式
│   └── login.css       # 登录页样式
├── js/
│   ├── dashboard.js    # 看板逻辑
│   └── login.js        # 登录逻辑（无硬编码密码）
├── backend/
│   ├── server.py       # 后端 HTTP API 服务（端口 8787）
│   ├── db.py           # 数据库连接层（SQLite / MySQL 双引擎）
│   ├── auth.py         # JWT 认证
│   ├── schema.sql      # SQLite 建表语句
│   ├── schema_mysql.sql# MySQL 建表语句
│   ├── seed_db.py      # 初始化数据库 + 写入测试数据
│   ├── services_metrics.py  # 指标计算逻辑
│   ├── migrate_add_dictionaries.py  # 字典表迁移脚本
│   ├── requirements.txt     # Python 依赖（仅 MySQL 模式需安装）
│   └── .env.example    # 环境变量配置模板
├── start.py            # 一键启动脚本（前端+后端，支持手机访问）
└── 部署说明.md          # 详细部署操作文档
```

---

## 快速启动（SQLite 模式，无需安装数据库）

适合本地开发、需求验证、演示展示。

```bash
# 1. 初始化数据库（首次运行或重置数据时）
cd backend
python3 seed_db.py

# 2. 一键启动前后端（自动打开浏览器，支持手机局域网访问）
cd ..
python3 start.py
```

启动后终端显示：

```
💻 本机访问：   http://127.0.0.1:8788/login.html?...
📱 手机访问：   http://192.168.x.x:8788/login.html?...
```

> 手机和电脑需连接**同一 WiFi**。

---

## 数据库切换：SQLite ↔ MySQL

通过 `backend/.env` 中的 **`DB_ENGINE`** 一行配置控制，其他所有代码文件无需改动。

```bash
# 复制配置模板
cp backend/.env.example backend/.env
```

### 模式一：SQLite（本地验证，默认）

```bash
# backend/.env
DB_ENGINE=sqlite
DASHBOARD_SECRET=any-local-dev-secret
```

```bash
cd backend && python3 seed_db.py   # 生成 backend/data/dashboard.db
```

### 模式二：MySQL（正式部署）

```bash
# backend/.env
DB_ENGINE=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=dashboard_user
DB_PASSWORD=your_password
DB_NAME=dashboard
DASHBOARD_SECRET=your-strong-production-secret
```

```bash
pip3 install mysql-connector-python
cd backend && python3 seed_db.py   # 在 MySQL 中建表并写入数据
```

> **切换后只需重新运行 `seed_db.py` 建表，然后重启后端即可。**

---

## 测试账号

| 角色 | 用户名 | 密码 |
|---|---|---|
| 区医保局领导 | `district` | `123456` |
| 镇街分管领导 | `street` | `123456` |
| 村居领导 | `village` | `123456` |
| 网格员 | `grid` | `123456` |

---

## 后端 API 一览

| 接口 | 说明 |
|---|---|
| `POST /api/auth/login` | 登录，返回 JWT Token |
| `GET  /api/bootstrap` | 初始化数据（组织树、参保快照）|
| `GET  /api/metrics/core\|age\|staff\|risk` | 各维度指标 |
| `GET  /api/list/residents` | 居民分页列表（含筛选）|
| `GET  /api/list/enterprises` | 企业分页列表（含筛选）|
| `GET  /api/dictionary/filters` | 字典枚举值（从数据库读取）|
| `GET  /api/health` | 健康检查 |

---

## 字典管理

参保类型、重点人群等枚举值存储在 `dictionaries` 表，可直接修改数据库维护，无需改代码：

```sql
-- 新增字典值
INSERT INTO dictionaries(category, value, sort_order)
VALUES('重点对象', '老年人', 5);

-- 停用某个值
UPDATE dictionaries SET enabled = 0
WHERE category = '居民居住细分' AND value = '市外';
```

---

详细部署步骤见 **[部署说明.md](./部署说明.md)**
