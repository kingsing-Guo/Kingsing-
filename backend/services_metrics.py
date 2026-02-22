from collections import Counter, defaultdict


def get_descendants(conn, unit_id: str):
    rows = conn.execute("SELECT id, parent_id FROM org_units").fetchall()
    by_parent = defaultdict(list)
    for r in rows:
        by_parent[r["parent_id"]].append(r["id"])
    out = []
    stack = [unit_id]
    while stack:
        cur = stack.pop()
        out.append(cur)
        stack.extend(by_parent.get(cur, []))
    return out


def resolve_scope(conn, user, requested_unit_id=None):
    allowed = set(get_descendants(conn, user["unit_id"]))
    scope = user["unit_id"]
    if requested_unit_id:
        req_desc = set(get_descendants(conn, requested_unit_id))
        # only allow selecting self or descendants
        if requested_unit_id in allowed:
            scope = requested_unit_id
            allowed = req_desc
        else:
            return None
    return sorted(list(allowed if scope == user["unit_id"] else set(get_descendants(conn, scope))))


def _fetch_residents(conn, unit_ids, year):
    if not unit_ids:
        return []
    marks = ",".join(["?"] * len(unit_ids))
    sql = f"SELECT * FROM residents WHERE year=? AND unit_id IN ({marks})"
    return conn.execute(sql, [year] + unit_ids).fetchall()


def _fetch_enterprises(conn, unit_ids, year):
    if not unit_ids:
        return []
    marks = ",".join(["?"] * len(unit_ids))
    sql = f"SELECT * FROM enterprises WHERE year=? AND unit_id IN ({marks})"
    return conn.execute(sql, [year] + unit_ids).fetchall()


def compute_core_metrics(residents):
    total_pop = len(residents)
    done_total = sum(1 for r in residents if r["this_year_paid"] == 1)
    done_staff = sum(1 for r in residents if r["this_year_paid"] == 1 and r["this_year_type"] == "职工保")
    done_resident = sum(1 for r in residents if r["this_year_paid"] == 1 and r["this_year_type"] == "居民保")

    target_total = max(round(total_pop * 0.92), done_total)
    target_staff = max(round(target_total * 0.42), done_staff)
    target_resident = max(target_total - target_staff, done_resident)

    gap_total = max(target_total - done_total, 0)
    gap_staff = max(target_staff - done_staff, 0)
    gap_resident = max(target_resident - done_resident, 0)

    stock_mobilizable = sum(1 for r in residents if r["stock_change_type"] == "可动员")
    increment_mobilizable = sum(
        1
        for r in residents
        if r["this_year_paid"] == 0
        and r["last_year_local_paid"] == 0
        and (r["household"] == "本区户籍" or r["residence"] == "本区居住")
    )
    mobilizable_total = stock_mobilizable + increment_mobilizable

    return {
        "target_total": target_total,
        "target_staff": target_staff,
        "target_resident": target_resident,
        "done_total": done_total,
        "done_staff": done_staff,
        "done_resident": done_resident,
        "gap_total": gap_total,
        "gap_staff": gap_staff,
        "gap_resident": gap_resident,
        "done_rate": round(done_total * 100 / target_total, 1) if target_total else 0,
        "done_staff_rate": round(done_staff * 100 / target_staff, 1) if target_staff else 0,
        "done_resident_rate": round(done_resident * 100 / target_resident, 1) if target_resident else 0,
        "mobilizable_total": mobilizable_total,
        "mobilizable_stock": stock_mobilizable,
        "mobilizable_increment": increment_mobilizable,
        "risk_flag": mobilizable_total < gap_resident,
    }


def compute_age_metrics(residents):
    groups = [
        ("16岁及以下", lambda a: a <= 16),
        ("16-30岁", lambda a: 16 <= a <= 30),
        ("31-45岁", lambda a: 31 <= a <= 45),
        ("46-60岁", lambda a: 46 <= a <= 60),
        ("60岁以上", lambda a: a > 60),
    ]
    total = max(len(residents), 1)
    out = []
    for name, fn in groups:
        arr = [r for r in residents if fn(r["age"])]
        cnt = len(arr)
        insured = sum(1 for r in arr if r["this_year_paid"] == 1)
        male = sum(1 for r in arr if r["gender"] == "男")
        female = cnt - male
        out.append(
            {
                "age_group": name,
                "count": cnt,
                "share": round(cnt * 100 / total, 1),
                "insured_rate": round(insured * 100 / cnt, 1) if cnt else 0,
                "male": male,
                "female": female,
            }
        )
    return out


def compute_staff_metrics(residents, enterprises):
    staff_people = [r for r in residents if r["this_year_type"] == "职工保"]
    total_staff_people = len(staff_people)
    big_counter = Counter(r["staff_big_type"] for r in staff_people if r["staff_big_type"])
    detail_counter = Counter(r["staff_detail_type"] for r in staff_people if r["staff_detail_type"])

    units_total = len(enterprises)
    units_insured = sum(1 for e in enterprises if e["staff_insured"] == 1)
    units_last = sum(1 for e in enterprises if e["last_month_staff_insured"] == 1)

    def mom(cur, last):
        if last == 0:
            return 0
        return round((cur - last) * 100 / last, 1)

    return {
        "staff_people_total": total_staff_people,
        "staff_big": dict(big_counter),
        "staff_detail": dict(detail_counter),
        "units_total": units_total,
        "units_insured": units_insured,
        "units_uninsured": max(units_total - units_insured, 0),
        "units_insured_rate": round(units_insured * 100 / units_total, 1) if units_total else 0,
        "units_uninsured_rate": round((units_total - units_insured) * 100 / units_total, 1) if units_total else 0,
        "units_insured_mom": mom(units_insured, units_last),
        "units_uninsured_mom": mom(units_total - units_insured, units_total - units_last),
    }


def compute_risk_metrics(residents, enterprises):
    high = [e for e in enterprises if e["risk"] == "高"]
    mid = [e for e in enterprises if e["risk"] == "中"]
    flows = {
        "转居民保": sum(1 for r in residents if r["pause_flow"] == "转居民保"),
        "申请停保": sum(1 for r in residents if r["pause_flow"] == "申请停保"),
        "跨区转出": sum(1 for r in residents if r["pause_flow"] == "跨区转出"),
    }
    return {"high_risk_enterprises": len(high), "mid_risk_enterprises": len(mid), "pause_flows": flows}


def query_residents(conn, unit_ids, year, filters):
    marks = ",".join(["?"] * len(unit_ids))
    sql = f"SELECT * FROM residents WHERE year=? AND unit_id IN ({marks})"
    params = [year] + list(unit_ids)

    if filters.get("name"):
        sql += " AND name LIKE ?"
        params.append(f"%{filters['name']}%")
    if filters.get("phone"):
        sql += " AND phone LIKE ?"
        params.append(f"%{filters['phone']}%")
    if filters.get("address"):
        sql += " AND (household_addr LIKE ? OR residence_addr LIKE ?)"
        params.extend([f"%{filters['address']}%", f"%{filters['address']}%"])

    # fixed tag groups
    for k in [
        "household", "residence", "residence_detail", "insured_place", "this_year_type", "stock_change_type",
        "loss_reason", "pause_flow", "key_group", "hardship_type", "staff_big_type", "staff_detail_type", "gender",
    ]:
        if filters.get(k):
            sql += f" AND {k}=?"
            params.append(filters[k])

    rows = conn.execute(sql + " ORDER BY id LIMIT ? OFFSET ?", params + [filters.get("limit", 100), filters.get("offset", 0)]).fetchall()
    total = conn.execute("SELECT COUNT(1) c FROM (" + sql + ")", params).fetchone()["c"]
    return rows, total


def query_enterprises(conn, unit_ids, year, filters):
    marks = ",".join(["?"] * len(unit_ids))
    sql = f"SELECT * FROM enterprises WHERE year=? AND unit_id IN ({marks})"
    params = [year] + list(unit_ids)

    if filters.get("name"):
        sql += " AND name LIKE ?"
        params.append(f"%{filters['name']}%")
    if filters.get("contact_person"):
        sql += " AND contact_person LIKE ?"
        params.append(f"%{filters['contact_person']}%")
    if filters.get("address"):
        sql += " AND address LIKE ?"
        params.append(f"%{filters['address']}%")

    for k in ["risk"]:
        if filters.get(k):
            sql += f" AND {k}=?"
            params.append(filters[k])
    if filters.get("staff_insured") in [0, 1, "0", "1"]:
        sql += " AND staff_insured=?"
        params.append(int(filters["staff_insured"]))

    rows = conn.execute(sql + " ORDER BY id LIMIT ? OFFSET ?", params + [filters.get("limit", 100), filters.get("offset", 0)]).fetchall()
    total = conn.execute("SELECT COUNT(1) c FROM (" + sql + ")", params).fetchone()["c"]
    return rows, total
