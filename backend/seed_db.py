import random
import sqlite3
from pathlib import Path

BASE = Path(__file__).resolve().parent
DB = BASE / "data" / "dashboard.db"
SCHEMA = BASE / "schema.sql"


def ensure_dirs():
    (BASE / "data").mkdir(parents=True, exist_ok=True)


def exec_schema(conn):
    conn.executescript(SCHEMA.read_text(encoding="utf-8"))


def seed_units(conn):
    units = [
        ("D001", "九龙坡区", "district", None),
        ("S001", "杨家坪街道", "street", "D001"),
        ("S002", "石桥铺街道", "street", "D001"),
        ("S003", "西彭镇", "street", "D001"),
        ("V001", "渝州路社区", "village", "S002"),
        ("V002", "天兴路社区", "village", "S002"),
        ("V003", "杨家坪正街社区", "village", "S001"),
        ("V004", "西彭社区", "village", "S003"),
        ("G001", "渝州路社区第3网格", "grid", "V001"),
    ]
    conn.executemany("INSERT OR REPLACE INTO org_units(id,name,level,parent_id) VALUES(?,?,?,?)", units)


def seed_users(conn):
    users = [
        ("U001", "district", "123456", "焦主任", "district_leader", "D001", 1),
        ("U002", "street", "123456", "李主任", "street_leader", "S002", 1),
        ("U003", "village", "123456", "王书记", "village_leader", "V001", 1),
        ("U004", "grid", "123456", "周网格员", "grid_user", "G001", 1),
    ]
    conn.executemany(
        "INSERT OR REPLACE INTO users(id,username,password,display_name,role,unit_id,enabled) VALUES(?,?,?,?,?,?,?)",
        users,
    )


def rand_phone(i):
    return f"13{5 + (i % 5)}{random.randint(1000,9999)}{random.randint(1000,9999)}"


def mask_addr(base, i):
    return f"重庆市九龙坡区{base}{i}号"


def seed_residents(conn, year=2026):
    random.seed(20260222)
    villages = ["V001", "V002", "V003", "V004"]
    key_groups = ["新生儿", "中小学生", "高校生", "资助对象", ""]
    hardship_types = ["低保对象", "残疾对象", "特困对象", ""]
    staff_details = ["在职职工", "单位退休人员", "灵活就业（一档）", "灵活就业（二档）", "个人退休（一档）", "个人退休（二档）"]

    rows = []
    n = 3200
    for i in range(1, n + 1):
        unit_id = villages[i % len(villages)]
        age = random.randint(0, 80)
        gender = "男" if i % 2 == 0 else "女"
        household = "本区户籍" if i % 3 != 0 else "非本区户籍"
        residence = "本区居住" if i % 4 != 0 else "外区居住"
        residence_detail = ["本辖区", "区内其他辖区", "市内外区", "市外"][i % 4]

        this_year_paid = 1 if random.random() < 0.78 else 0
        this_year_type = "职工保" if (this_year_paid and age >= 18 and random.random() < 0.43) else ("居民保" if this_year_paid else "未参保")
        if age < 18 and this_year_type == "职工保":
            this_year_type = "居民保"

        insured_place = ""
        if this_year_paid:
            insured_place = ["本区县参保", "市内外区参保", "市外参保"][i % 3]

        last_year_paid = 1 if random.random() < 0.84 else 0
        last_year_local_paid = 1 if (last_year_paid and random.random() < 0.75) else 0

        if last_year_local_paid == 1 and this_year_paid == 1 and this_year_type == "居民保" and insured_place == "本区县参保":
            stock_change_type = "存量续保"
        elif last_year_local_paid == 1 and this_year_paid == 0:
            stock_change_type = random.choice(["可动员", "停保", "死亡", "辖区外参保", "转职工保（含灵活就业参保）"])
        elif last_year_local_paid == 1 and this_year_type == "职工保":
            stock_change_type = "转职工保（含灵活就业参保）"
        else:
            stock_change_type = "可动员" if this_year_paid == 0 else "存量续保"

        loss_reason = stock_change_type if stock_change_type in ["死亡", "辖区外参保", "停保", "转职工保（含灵活就业参保）"] else ""
        pause_flow = random.choice(["转居民保", "申请停保", "跨区转出", ""]) if this_year_paid == 0 else ""

        key_group = key_groups[i % len(key_groups)]
        if age <= 1:
            key_group = "新生儿"
        elif 6 <= age <= 18 and random.random() < 0.7:
            key_group = "中小学生"
        elif 16 <= age <= 30 and random.random() < 0.5:
            key_group = "高校生"

        is_hardship = 1 if key_group == "资助对象" or random.random() < 0.14 else 0
        hardship_type = hardship_types[i % len(hardship_types)] if is_hardship else ""

        staff_big_type = ""
        staff_detail_type = ""
        if this_year_type == "职工保":
            staff_big_type = "单位参保" if random.random() < 0.46 else "个人参保（灵活就业）"
            staff_detail_type = random.choice(staff_details)

        rows.append(
            (
                f"R{i:05d}", f"居民{i}", rand_phone(i), gender, age, unit_id, household, residence, residence_detail,
                insured_place, this_year_type, this_year_paid, last_year_paid, last_year_local_paid, stock_change_type,
                loss_reason, pause_flow, key_group, is_hardship, hardship_type, staff_big_type, staff_detail_type,
                mask_addr("户籍地", i), mask_addr("居住地", i), year,
            )
        )

    conn.executemany(
        """
        INSERT OR REPLACE INTO residents(
          id,name,phone,gender,age,unit_id,household,residence,residence_detail,insured_place,
          this_year_type,this_year_paid,last_year_paid,last_year_local_paid,stock_change_type,loss_reason,pause_flow,
          key_group,is_hardship,hardship_type,staff_big_type,staff_detail_type,household_addr,residence_addr,year
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """,
        rows,
    )


def seed_enterprises(conn, year=2026):
    random.seed(20260223)
    units = ["V001", "V002", "V003", "V004", "S001", "S002", "S003"]
    rows = []
    for i in range(1, 520):
        unit = units[i % len(units)]
        staff_insured = 1 if random.random() < 0.74 else 0
        last_month = 1 if random.random() < 0.71 else 0
        risk = "高" if random.random() < 0.12 else ("中" if random.random() < 0.24 else "低")
        rows.append(
            (
                f"E{i:04d}", f"企业{i}", f"法人{i}", f"联系人{i}", rand_phone(8000 + i),
                f"重庆市九龙坡区企业路{i}号", unit, risk, staff_insured, last_month,
                round(random.uniform(5, 35), 1), random.randint(0, 6), year,
            )
        )
    conn.executemany(
        """
        INSERT OR REPLACE INTO enterprises(
          id,name,legal_person,contact_person,phone,address,unit_id,risk,staff_insured,last_month_staff_insured,gap_rate,duration,year
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
        """,
        rows,
    )


def main():
    ensure_dirs()
    conn = sqlite3.connect(DB)
    try:
        exec_schema(conn)
        seed_units(conn)
        seed_users(conn)
        seed_residents(conn)
        seed_enterprises(conn)
        conn.commit()
        print(f"seed ok: {DB}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
