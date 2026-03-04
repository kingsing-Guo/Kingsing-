-- schema_mysql.sql ——  MySQL 版建表语句
-- 字符集：utf8mb4 / utf8mb4_unicode_ci（支持中文和 emoji）
-- 适用 MySQL 8.0+
-- 执行方式：
--   mysql -u root -p dashboard < schema_mysql.sql
-- 或在 Python 中通过 conn.executescript(Path('schema_mysql.sql').read_text()) 执行

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ─── 组织架构 ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_units (
    id        VARCHAR(64)  NOT NULL,
    name      VARCHAR(128) NOT NULL,
    level     VARCHAR(16)  NOT NULL,
    parent_id VARCHAR(64)  DEFAULT NULL,
    PRIMARY KEY (id),
    CONSTRAINT chk_org_level CHECK (level IN ('district','street','village','grid')),
    FOREIGN KEY (parent_id) REFERENCES org_units(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 用户账号 ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id           VARCHAR(64)  NOT NULL,
    username     VARCHAR(64)  NOT NULL,
    password     VARCHAR(255) NOT NULL,
    display_name VARCHAR(64)  NOT NULL,
    role         VARCHAR(32)  NOT NULL,
    unit_id      VARCHAR(64)  NOT NULL,
    enabled      TINYINT      NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY uk_username (username),
    CONSTRAINT chk_user_role CHECK (
        role IN ('district_leader','street_leader','village_leader','grid_user')
    ),
    FOREIGN KEY (unit_id) REFERENCES org_units(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 居民参保数据 ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS residents (
    id                  VARCHAR(64)  NOT NULL,
    name                VARCHAR(64)  NOT NULL,
    phone               VARCHAR(32)  NOT NULL,
    gender              VARCHAR(4)   NOT NULL,
    age                 INT          NOT NULL,
    unit_id             VARCHAR(64)  NOT NULL,
    household           VARCHAR(32)  NOT NULL,
    residence           VARCHAR(32)  NOT NULL,
    residence_detail    VARCHAR(32)  NOT NULL,
    insured_place       VARCHAR(32)  NOT NULL DEFAULT '',
    this_year_type      VARCHAR(32)  NOT NULL,
    this_year_paid      TINYINT      NOT NULL DEFAULT 0,
    last_year_paid      TINYINT      NOT NULL DEFAULT 0,
    last_year_local_paid TINYINT     NOT NULL DEFAULT 0,
    stock_change_type   VARCHAR(64)  NOT NULL DEFAULT '',
    loss_reason         VARCHAR(64)  NOT NULL DEFAULT '',
    pause_flow          VARCHAR(32)  NOT NULL DEFAULT '',
    key_group           VARCHAR(32)  NOT NULL DEFAULT '',
    is_hardship         TINYINT      NOT NULL DEFAULT 0,
    hardship_type       VARCHAR(32)  NOT NULL DEFAULT '',
    staff_big_type      VARCHAR(32)  NOT NULL DEFAULT '',
    staff_detail_type   VARCHAR(64)  NOT NULL DEFAULT '',
    household_addr      VARCHAR(255) NOT NULL DEFAULT '',
    residence_addr      VARCHAR(255) NOT NULL DEFAULT '',
    year                INT          NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT chk_gender CHECK (gender IN ('男','女')),
    FOREIGN KEY (unit_id) REFERENCES org_units(id),
    INDEX idx_residents_unit_year (unit_id, year),
    INDEX idx_residents_name (name),
    INDEX idx_residents_type (this_year_type, this_year_paid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 企业参保数据 ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enterprises (
    id                      VARCHAR(64)  NOT NULL,
    name                    VARCHAR(128) NOT NULL,
    legal_person            VARCHAR(64)  NOT NULL DEFAULT '',
    contact_person          VARCHAR(64)  NOT NULL DEFAULT '',
    phone                   VARCHAR(32)  NOT NULL DEFAULT '',
    address                 VARCHAR(255) NOT NULL DEFAULT '',
    unit_id                 VARCHAR(64)  NOT NULL,
    risk                    VARCHAR(8)   NOT NULL,
    staff_insured           TINYINT      NOT NULL DEFAULT 0,
    last_month_staff_insured TINYINT     NOT NULL DEFAULT 0,
    gap_rate                DOUBLE       NOT NULL DEFAULT 0,
    duration                INT          NOT NULL DEFAULT 0,
    year                    INT          NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (unit_id) REFERENCES org_units(id),
    INDEX idx_enterprises_unit_year (unit_id, year),
    INDEX idx_enterprises_risk (risk)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 字典表 ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dictionaries (
    id          INT          NOT NULL AUTO_INCREMENT,
    category    VARCHAR(64)  NOT NULL,
    value       VARCHAR(128) NOT NULL,
    sort_order  INT          NOT NULL DEFAULT 0,
    enabled     TINYINT      NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY idx_dict_cat_val (category, value),
    INDEX idx_dict_category (category, enabled, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
