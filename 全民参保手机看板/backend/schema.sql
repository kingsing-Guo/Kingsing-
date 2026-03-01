PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS org_units (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT NOT NULL CHECK(level IN ('district','street','village','grid')),
  parent_id TEXT,
  FOREIGN KEY(parent_id) REFERENCES org_units(id)
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('district_leader','street_leader','village_leader','grid_user')),
  unit_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY(unit_id) REFERENCES org_units(id)
);

CREATE TABLE IF NOT EXISTS residents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  gender TEXT NOT NULL CHECK(gender IN ('男','女')),
  age INTEGER NOT NULL,
  unit_id TEXT NOT NULL,
  household TEXT NOT NULL,
  residence TEXT NOT NULL,
  residence_detail TEXT NOT NULL,
  insured_place TEXT NOT NULL,
  this_year_type TEXT NOT NULL,
  this_year_paid INTEGER NOT NULL,
  last_year_paid INTEGER NOT NULL,
  last_year_local_paid INTEGER NOT NULL,
  stock_change_type TEXT NOT NULL,
  loss_reason TEXT NOT NULL,
  pause_flow TEXT NOT NULL,
  key_group TEXT NOT NULL,
  is_hardship INTEGER NOT NULL,
  hardship_type TEXT NOT NULL,
  staff_big_type TEXT NOT NULL,
  staff_detail_type TEXT NOT NULL,
  household_addr TEXT NOT NULL,
  residence_addr TEXT NOT NULL,
  year INTEGER NOT NULL,
  FOREIGN KEY(unit_id) REFERENCES org_units(id)
);

CREATE TABLE IF NOT EXISTS enterprises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  legal_person TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  risk TEXT NOT NULL,
  staff_insured INTEGER NOT NULL,
  last_month_staff_insured INTEGER NOT NULL,
  gap_rate REAL NOT NULL,
  duration INTEGER NOT NULL,
  year INTEGER NOT NULL,
  FOREIGN KEY(unit_id) REFERENCES org_units(id)
);

CREATE INDEX IF NOT EXISTS idx_residents_unit_year ON residents(unit_id, year);
CREATE INDEX IF NOT EXISTS idx_residents_name ON residents(name);
CREATE INDEX IF NOT EXISTS idx_residents_type ON residents(this_year_type, this_year_paid);
CREATE INDEX IF NOT EXISTS idx_enterprises_unit_year ON enterprises(unit_id, year);
CREATE INDEX IF NOT EXISTS idx_enterprises_risk ON enterprises(risk);
