# 全民参保看板后端（起步版）

已完成能力：
- SQLite 数据模型（居民、企业、组织、用户）
- 指标口径计算服务（核心指标、年龄、职工参保、风险监测）
- 登录鉴权（Token）
- 角色+层级数据权限（区/镇街/村居/网格，只能看本级及以下）
- 列表查询 API（居民/企业）

## 1. 初始化数据库
```bash
cd backend
python3 seed_db.py
```

## 2. 启动后端
```bash
cd backend
python3 server.py
```

默认地址：`http://127.0.0.1:8787`

## 3. 测试账号
- 区级：`district / 123456`（焦主任）
- 镇街：`street / 123456`
- 村居：`village / 123456`
- 网格：`grid / 123456`

## 4. 核心接口
- `POST /api/auth/login`
- `GET /api/auth/profile`
- `GET /api/metrics/core?year=2026&unit_id=S002`
- `GET /api/metrics/age?year=2026&unit_id=S002`
- `GET /api/metrics/staff?year=2026&unit_id=S002`
- `GET /api/metrics/risk?year=2026&unit_id=S002`
- `GET /api/list/residents?...`
- `GET /api/list/enterprises?...`
- `GET /api/dictionary/filters`

## 5. 下一步（你确认的三步中的后续）
- 把前端 `index.html` 的模拟数据切换到 API 拉取
- 增加指标对账任务（口径一致性自动校验）
- 账号接入真实 SSO，替换当前示例登录
