"""
db.py — 数据库连接模块，支持 SQLite（本地开发）和 MySQL（生产部署）双引擎

通过环境变量 DB_ENGINE 切换：
  DB_ENGINE=sqlite   （默认）使用 SQLite 单文件数据库，无需额外安装
  DB_ENGINE=mysql    使用 MySQL，需配置 DB_HOST / DB_USER / DB_PASSWORD / DB_NAME

其他相关环境变量（详见 .env.example）：
  SQLite: DASHBOARD_DB  — db 文件路径，默认 backend/data/dashboard.db
  MySQL:  DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME
"""
import os
import re
import sqlite3
from pathlib import Path

# ── 读取同目录 .env ────────────────────────────────────────────────────────────
def _load_dotenv():
    env_path = Path(__file__).parent / ".env"
    if not env_path.exists():
        return
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            if k and k not in os.environ:
                os.environ[k] = v


_load_dotenv()

# ── 引擎选择 ───────────────────────────────────────────────────────────────────
DB_ENGINE = os.getenv("DB_ENGINE", "sqlite").strip().lower()  # "sqlite" | "mysql"


# ── MySQL 兼容包装层（仅 DB_ENGINE=mysql 时使用）───────────────────────────────
def _q2pct(sql: str) -> str:
    """将 ? 占位符替换为 MySQL 的 %s。"""
    return sql.replace("?", "%s")


class _CompatResult:
    """将 MySQL cursor 包装成支持 fetchall / fetchone 的对象，行以 dict 返回。"""

    def __init__(self, cursor):
        cols = [d[0] for d in (cursor.description or [])]
        raw = cursor.fetchall() if cursor.description else []
        self._rows = [dict(zip(cols, row)) for row in raw]
        self._pos = 0

    def fetchall(self):
        return self._rows

    def fetchone(self):
        if self._pos < len(self._rows):
            row = self._rows[self._pos]
            self._pos += 1
            return row
        return None

    def __iter__(self):
        return iter(self._rows)


class MySQLCompatConn:
    """对 mysql.connector 连接做薄封装，提供与 SQLite 相同的调用接口。"""

    def __init__(self, raw_conn):
        self._conn = raw_conn

    def execute(self, sql: str, params=None):
        cur = self._conn.cursor()
        cur.execute(_q2pct(sql), params or [])
        return _CompatResult(cur)

    def executemany(self, sql: str, rows):
        if not rows:
            return
        cur = self._conn.cursor()
        cur.executemany(_q2pct(sql), list(rows))

    def executescript(self, sql: str):
        """按分号切割并逐条执行 DDL/DML 语句。"""
        cur = self._conn.cursor()
        cleaned = re.sub(r"--[^\n]*", "", sql)
        cleaned = re.sub(r"/\*.*?\*/", "", cleaned, flags=re.DOTALL)
        for stmt in (s.strip() for s in cleaned.split(";") if s.strip()):
            cur.execute(stmt)
        self._conn.commit()

    def commit(self):
        self._conn.commit()

    def close(self):
        self._conn.close()


# ── 统一入口 ───────────────────────────────────────────────────────────────────
def get_conn():
    """
    根据 DB_ENGINE 返回对应的数据库连接。

    SQLite（默认）：直接返回 sqlite3 原生连接，row_factory = sqlite3.Row。
    MySQL         ：返回 MySQLCompatConn 包装对象，接口与 SQLite 完全一致。
    """
    if DB_ENGINE == "mysql":
        try:
            import mysql.connector
        except ImportError:
            raise RuntimeError(
                "mysql-connector-python 未安装。\n"
                "请执行：pip3 install mysql-connector-python"
            )
        raw = mysql.connector.connect(
            host=os.getenv("DB_HOST", "127.0.0.1"),
            port=int(os.getenv("DB_PORT", "3306")),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            database=os.getenv("DB_NAME", "dashboard"),
            charset="utf8mb4",
            use_unicode=True,
            autocommit=False,
        )
        return MySQLCompatConn(raw)

    # SQLite（默认引擎）
    BASE_DIR = Path(__file__).resolve().parent
    db_path = os.getenv("DASHBOARD_DB", str(BASE_DIR / "data" / "dashboard.db"))
    (Path(db_path).parent).mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn
