#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
migrate_add_dictionaries.py
-------------------------------------------------------
一次性迁移脚本：为已存在的数据库补建 dictionaries 表
并写入全部初始字典数据。

支持 SQLite 和 MySQL，通过 DB_ENGINE 环境变量自动识别。
操作幂等——可重复执行，不影响已有居民/企业/用户数据。

使用方法：
    cd backend
    python3 migrate_add_dictionaries.py
"""
import os
from pathlib import Path

from db import get_conn, DB_ENGINE

# SQLite 版建表 DDL
_DDL_SQLITE = """
CREATE TABLE IF NOT EXISTS dictionaries (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    category    TEXT    NOT NULL,
    value       TEXT    NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    enabled     INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dict_cat_val
    ON dictionaries(category, value);
CREATE INDEX IF NOT EXISTS idx_dict_category
    ON dictionaries(category, enabled, sort_order);
"""

# MySQL 版建表 DDL
_DDL_MYSQL = """
CREATE TABLE IF NOT EXISTS dictionaries (
    id          INT         NOT NULL AUTO_INCREMENT,
    category    VARCHAR(64) NOT NULL,
    value       VARCHAR(128) NOT NULL,
    sort_order  INT         NOT NULL DEFAULT 0,
    enabled     TINYINT     NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY idx_dict_cat_val (category, value),
    INDEX idx_dict_category (category, enabled, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"""

DDL = _DDL_MYSQL if DB_ENGINE == "mysql" else _DDL_SQLITE


DICT_DATA = [
    ("对象类型",       "居民",                       0),
    ("对象类型",       "企业",                       1),

    ("居民户籍",       "本区户籍",                   0),
    ("居民户籍",       "非本区户籍",                 1),

    ("居民居住",       "本区居住",                   0),
    ("居民居住",       "外区居住",                   1),

    ("居民居住细分",   "本辖区",                     0),
    ("居民居住细分",   "区内其他辖区",               1),
    ("居民居住细分",   "市内外区",                   2),
    ("居民居住细分",   "市外",                       3),

    ("参保地",         "本区县参保",                 0),
    ("参保地",         "市内外区参保",               1),
    ("参保地",         "市外参保",                   2),

    ("今年参保类型",   "居民保",                     0),
    ("今年参保类型",   "职工保",                     1),
    ("今年参保类型",   "未参保",                     2),

    ("存量变化类型",   "存量续保",                   0),
    ("存量变化类型",   "可动员",                     1),
    ("存量变化类型",   "停保",                       2),
    ("存量变化类型",   "死亡",                       3),
    ("存量变化类型",   "辖区外参保",                 4),
    ("存量变化类型",   "转职工保（含灵活就业参保）", 5),

    ("存量减员原因",   "死亡",                       0),
    ("存量减员原因",   "辖区外参保",                 1),
    ("存量减员原因",   "停保",                       2),
    ("存量减员原因",   "转职工保（含灵活就业参保）", 3),

    ("职工减员流向",   "转居民保",                   0),
    ("职工减员流向",   "申请停保",                   1),
    ("职工减员流向",   "跨区转出",                   2),

    ("重点对象",       "新生儿",                     0),
    ("重点对象",       "中小学生",                   1),
    ("重点对象",       "高校生",                     2),
    ("重点对象",       "资助对象",                   3),

    ("资助对象细类",   "低保对象",                   0),
    ("资助对象细类",   "残疾对象",                   1),
    ("资助对象细类",   "特困对象",                   2),

    ("职工参保大类",   "单位参保",                   0),
    ("职工参保大类",   "个人参保（灵活就业）",       1),

    ("职工参保细类",   "在职职工",                   0),
    ("职工参保细类",   "单位退休人员",               1),
    ("职工参保细类",   "灵活就业（一档）",           2),
    ("职工参保细类",   "灵活就业（二档）",           3),
    ("职工参保细类",   "个人退休（一档）",           4),
    ("职工参保细类",   "个人退休（二档）",           5),

    ("企业风险等级",   "高",                         0),
    ("企业风险等级",   "中",                         1),
    ("企业风险等级",   "低",                         2),

    ("单位参保状态",   "参加职工保",                 0),
    ("单位参保状态",   "未参加职工保",               1),

    ("居民性别",       "男",                         0),
    ("居民性别",       "女",                         1),
]


def migrate():
    conn = get_conn()
    try:
        # 建表（已存在则跳过）
        conn.executescript(DDL)
        # 写入字典数据（幂等）
        conn.executemany(
            "REPLACE INTO dictionaries(category, value, sort_order) VALUES(?,?,?)",
            DICT_DATA,
        )
        conn.commit()

        # 验证
        count = conn.execute("SELECT COUNT(*) as cnt FROM dictionaries").fetchone()["cnt"]
        cats  = conn.execute("SELECT COUNT(DISTINCT category) as cnt FROM dictionaries").fetchone()["cnt"]
        print("\u2705 迁移完成（MySQL dashboard 数据库）")
        print(f"   字典条目：{count} 条 / {cats} 个分类")
    finally:
        conn.close()


if __name__ == "__main__":
    migrate()
