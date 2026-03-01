import json
import math
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from auth import issue_token, verify_token
from db import get_conn
from services_metrics import (
    compute_age_metrics,
    compute_core_metrics,
    compute_risk_metrics,
    compute_staff_metrics,
    query_enterprises,
    query_residents,
    resolve_scope,
)

HOST = "0.0.0.0"
PORT = 8787

ROAD_COMMUNITY_MAP = {
    "九龙园区大道": "九龙园区社区",
    "渝州路": "渝州路社区",
    "科园一路": "科园一路社区",
    "石杨路": "石桥铺社区",
    "前进路": "前进路社区",
    "天兴路": "天兴路社区",
    "团结路": "团结路社区",
    "铝城大道": "铝城村",
}
ROAD_POOL = ["九龙园区大道", "渝州路", "科园一路", "石杨路", "前进路", "天兴路", "团结路", "铝城大道"]
UNIT_TYPES = ["企业", "个体", "机关", "事业", "社会组织"]
INDUSTRIES = ["制造业", "建筑业", "批发和零售业", "交通运输、仓储和邮政业", "住宿和餐饮业", "信息传输、软件和信息技术服务业", "金融业", "房地产业", "租赁和商务服务业", "教育", "卫生和社会工作"]
UNIT_NATURES = ["国企", "民企", "混合", "外资", "中外合资"]
STAFF_DETAIL_DEFS = [
    ("在职职工", "单位参保", 0.34),
    ("单位退休人员", "单位参保", 0.12),
    ("灵活就业（一档）", "个人参保（灵活就业）", 0.20),
    ("灵活就业（二档）", "个人参保（灵活就业）", 0.14),
    ("个人退休（一档）", "个人参保（灵活就业）", 0.10),
    ("个人退休（二档）", "个人参保（灵活就业）", 0.10),
]
CONFIRMED_LOSS_TYPES = {"死亡", "辖区外参保", "停保", "转职工保（含灵活就业参保）"}


def row_to_dict(row):
    return dict(row) if row is not None else None


def _stable_hash(s):
    text = str(s or "")
    return sum((i + 1) * ord(ch) for i, ch in enumerate(text))


def _seeded_rand(seed):
    x = math.sin(seed * 12.9898) * 43758.5453
    return x - math.floor(x)


def _pick_staff_detail(seed):
    p = _seeded_rand(seed)
    total = sum(w for _, _, w in STAFF_DETAIL_DEFS) or 1
    acc = 0.0
    for detail, big, w in STAFF_DETAIL_DEFS:
        acc += (w / total)
        if p <= acc:
            return detail, big
    return STAFF_DETAIL_DEFS[0][0], STAFF_DETAIL_DEFS[0][1]


def _default_hardship_type(seed):
    types = ["低保对象", "残疾对象", "特困对象"]
    return types[seed % len(types)]


def _normalize_resident_logic(r, seed):
    age = int(r.get("age") or 0)
    paid = bool(r.get("thisYearPaid"))
    this_type = r.get("thisYearType") or ("居民保" if paid else "未参保")
    stock = r.get("stockChangeType") or ""
    loss = r.get("lossReason") or ""

    # 参保状态与类型一致性
    if not paid:
        this_type = "未参保"
        r["insuredPlace"] = ""
    elif this_type not in {"居民保", "职工保"}:
        this_type = "居民保"
    if age < 18 and this_type == "职工保":
        this_type = "居民保" if paid else "未参保"

    # 存量变化与减员原因互斥一致
    if stock in CONFIRMED_LOSS_TYPES:
        loss = stock
    elif loss in CONFIRMED_LOSS_TYPES:
        stock = loss

    # 明确不可动员的确认减员对象：与参保状态强一致
    if stock in {"死亡", "停保"}:
        paid = False
        this_type = "未参保"
        r["insuredPlace"] = ""
        loss = stock
    elif stock == "可动员":
        paid = False
        this_type = "未参保"
        r["insuredPlace"] = ""
        loss = ""
    elif stock == "转职工保（含灵活就业参保）":
        paid = True
        this_type = "职工保"
    elif stock == "存量续保":
        paid = True
        this_type = "居民保"
        if not r.get("insuredPlace"):
            r["insuredPlace"] = "本区县参保"

    # 非本地存量对象不允许使用“存量续保/可动员”口径
    if not bool(r.get("lastYearLocalPaid")) and stock in {"存量续保", "可动员"}:
        stock = ""
        loss = ""

    # 二次防呆：经过存量逻辑纠正后再次保证未成年人不落入职工保
    if age < 18 and this_type == "职工保":
        this_type = "居民保" if paid else "未参保"
        r["staffBigType"] = ""
        r["staffDetailType"] = ""
        if stock == "转职工保（含灵活就业参保）":
            if bool(r.get("lastYearLocalPaid")):
                stock = "存量续保" if (paid and r.get("insuredPlace") == "本区县参保") else ("辖区外参保" if paid else "可动员")
            else:
                stock = ""
            if stock not in CONFIRMED_LOSS_TYPES:
                loss = ""

    # 职工细类一致性
    if this_type != "职工保":
        r["staffBigType"] = ""
        r["staffDetailType"] = ""
    else:
        detail = r.get("staffDetailType") or ""
        big = r.get("staffBigType") or ""
        if not detail or not big:
            detail, big = _pick_staff_detail((seed + age + 1) * 17)
        if age >= 60 and detail in {"在职职工", "灵活就业（一档）", "灵活就业（二档）"}:
            detail = "单位退休人员"
            big = "单位参保"
        if age < 55 and detail in {"个人退休（一档）", "个人退休（二档）", "单位退休人员"} and _seeded_rand((seed + age) * 7) > 0.6:
            detail = "在职职工"
            big = "单位参保"
        r["staffDetailType"] = detail
        r["staffBigType"] = big

    # 重点对象与年龄一致性（严格年龄约束，避免出现“高龄新生儿/中小学生”）
    hardship = bool(r.get("isHardship")) or bool(r.get("hardshipType")) or r.get("keyGroup") == "资助对象"
    if age <= 1:
        key_group = "新生儿"
    elif 6 <= age <= 18 and (r.get("keyGroup") == "中小学生" or bool(r.get("isPrimarySecondary"))):
        key_group = "中小学生"
    elif 16 <= age <= 30 and (r.get("keyGroup") == "高校生" or bool(r.get("isCollege"))):
        key_group = "高校生"
    elif hardship:
        key_group = "资助对象"
    else:
        key_group = "无"

    hardship = hardship or key_group == "资助对象"
    hardship_type = r.get("hardshipType") or (_default_hardship_type(seed) if hardship else "")

    if stock == "存量续保" and not paid:
        stock = "可动员" if bool(r.get("lastYearLocalPaid")) else ""
        loss = ""
    if not paid and stock in {"存量续保"}:
        stock = "可动员" if bool(r.get("lastYearLocalPaid")) else ""
        loss = ""

    if paid and not r.get("insuredPlace"):
        r["insuredPlace"] = "本区县参保"

    r["thisYearPaid"] = paid
    r["thisYearType"] = this_type
    r["keyGroup"] = key_group
    r["isPrimarySecondary"] = key_group == "中小学生"
    r["isCollege"] = key_group == "高校生"
    r["isHardship"] = hardship
    r["hardshipType"] = hardship_type if hardship else ""
    r["stockChangeType"] = stock
    r["lossReason"] = loss
    if paid and r.get("pauseFlow") in {"转居民保", "申请停保", "跨区转出"}:
        r["pauseFlow"] = ""
    return r


def _format_std_address(admin, road, door_no, floor_no, room_no):
    floor = max(int(floor_no or 1), 1)
    room = max(int(room_no or 1), 1)
    door = max(int(door_no or 1), 1)
    return f"{admin}{road}{door}号{floor}层{room:02d}室"


def _extract_address_parts(addr):
    text = re.sub(r"\s+", "", str(addr or ""))
    if not text:
        return "", 0, None, None
    m = re.match(r"^(.*?区(?:.*?(?:街道|镇))?)([^0-9号层室]{1,20})(\d+)号(?:(\d+)层)?(?:(\d{1,2})室)?$", text)
    if m:
        return m.group(2), int(m.group(3)), (int(m.group(4)) if m.group(4) else None), (int(m.group(5)) if m.group(5) else None)
    m = re.search(r"([^0-9号层室]{1,20})(\d+)号", text)
    if m:
        return m.group(1), int(m.group(2)), None, None
    return "", 0, None, None


def _normalize_road_name(road, seed):
    text = str(road or "").strip()
    if not text:
        return ROAD_POOL[seed % len(ROAD_POOL)]
    if any(x in text for x in ["户籍地", "居住地", "企业路", "地址"]):
        return ROAD_POOL[seed % len(ROAD_POOL)]
    if len(text) <= 1:
        return ROAD_POOL[seed % len(ROAD_POOL)]
    return text


def _street_village_of_unit(by_id, unit_id):
    u = by_id.get(unit_id) or {}
    level = u.get("level")
    if level == "village":
        village = u.get("name", "未知社区")
        p = by_id.get(u.get("parent_id")) or {}
        street = p.get("name", "杨家坪街道")
        return street, village
    if level == "grid":
        v = by_id.get(u.get("parent_id")) or {}
        village = v.get("name", "未知社区")
        s = by_id.get(v.get("parent_id")) or {}
        street = s.get("name", "杨家坪街道")
        return street, village
    if level == "street":
        street = u.get("name", "杨家坪街道")
        return street, f"{street}辖区"
    return "杨家坪街道", "渝州路社区"


def _live_admin_by_residence_detail(street, residence_detail):
    if residence_detail == "本辖区":
        return f"重庆市九龙坡区{street}"
    if residence_detail == "区内其他辖区":
        return "重庆市九龙坡区石桥铺街道" if street != "石桥铺街道" else "重庆市九龙坡区杨家坪街道"
    if residence_detail == "市内外区":
        return "重庆市渝中区上清寺街道"
    if residence_detail == "市外":
        return "四川省成都市武侯区簇锦街道"
    return f"重庆市九龙坡区{street}"


def _enrich_bootstrap_payload(residents, enterprises, by_id):
    unit_enterprises = {}
    street_enterprises = {}

    for i, e in enumerate(enterprises):
        street, village = _street_village_of_unit(by_id, e.get("unitId"))
        admin = f"重庆市九龙坡区{street}"
        h = _stable_hash(e.get("id"))
        road, door, floor, room = _extract_address_parts(e.get("regAddress"))
        road = _normalize_road_name(road, h)
        door = door or ((h % 120) + 1)
        floor = floor or ((h % 18) + 1)
        room = room or ((h % 6) + 1)
        e["regAddress"] = _format_std_address(admin, road, door, floor, room)
        community = ROAD_COMMUNITY_MAP.get(road, f"{road}社区")
        e["managementArea"] = f"{admin}{community}"
        e["unitType"] = e.get("unitType") or UNIT_TYPES[h % len(UNIT_TYPES)]
        e["industryClass"] = e.get("industryClass") or INDUSTRIES[(h // 3) % len(INDUSTRIES)]
        e["unitNature"] = e.get("unitNature") or UNIT_NATURES[(h // 5) % len(UNIT_NATURES)]
        e["industry"] = e.get("industry") or e["industryClass"]
        e["place"] = e.get("place") or village
        unit_enterprises.setdefault(e.get("unitId"), []).append(e)
        street_enterprises.setdefault(street, []).append(e)

    residents_by_unit = {}
    for r in residents:
        residents_by_unit.setdefault(r.get("unitId"), []).append(r)

    for unit_id, arr in residents_by_unit.items():
        arr.sort(key=lambda x: x.get("id", ""))
        street, village = _street_village_of_unit(by_id, unit_id)
        admin = f"重庆市九龙坡区{street}"
        own_ents = unit_enterprises.get(unit_id, [])
        ent_candidates = own_ents if own_ents else street_enterprises.get(street, [])
        unit_seed = _stable_hash(unit_id)

        for idx, r in enumerate(arr):
            h = _stable_hash(r.get("id"))
            family_index = idx // 3
            family_member_index = idx % 3
            family_seed = unit_seed + family_index * 13

            hukou_road, _, _, _ = _extract_address_parts(r.get("hukouAddress"))
            hukou_road = _normalize_road_name(hukou_road, family_seed)
            hukou_door = (family_seed % 120) + 1
            hukou_floor = (family_seed % 22) + 1
            hukou_room = (family_seed % 4) + 1
            r["hukouAddress"] = _format_std_address(admin, hukou_road, hukou_door, hukou_floor, hukou_room)

            residence_detail = r.get("residenceDetail") or "本辖区"
            live_admin = _live_admin_by_residence_detail(street, residence_detail)
            live_road, live_door_raw, _, _ = _extract_address_parts(r.get("livingAddress"))
            live_road = _normalize_road_name(live_road, h + 3)
            live_door = live_door_raw or ((h % 120) + 1)
            live_floor = (h % 22) + 1
            live_room = ((h + 1) % 4) + 1
            r["livingAddress"] = _format_std_address(live_admin, live_road, live_door, live_floor, live_room)

            r["familyId"] = r.get("familyId") or f"F-{unit_id}-{family_index + 1:03d}"
            if not r.get("familyRole"):
                r["familyRole"] = ["户主", "配偶", "子女"][family_member_index] if family_member_index < 3 else "成员"

            age = int(r.get("age") or 0)
            if age < 18 and r.get("thisYearType") == "职工保":
                r["thisYearType"] = "居民保"
                r["staffBigType"] = ""
                r["staffDetailType"] = ""

            if r.get("thisYearType") == "职工保" and (not r.get("staffDetailType") or not r.get("staffBigType")):
                detail, big = _pick_staff_detail((h + age + idx + 1) * 17)
                r["staffDetailType"] = r.get("staffDetailType") or detail
                r["staffBigType"] = r.get("staffBigType") or big

            if r.get("thisYearPaid") and not r.get("insuredPlace"):
                p = (h + idx) % 10
                r["insuredPlace"] = "本区县参保" if p < 6 else ("市内外区参保" if p < 8 else "市外参保")
            if not r.get("thisYearPaid"):
                r["insuredPlace"] = ""

            need_employer = (r.get("thisYearType") == "职工保") or (age >= 18 and (r.get("staffDetailType") or r.get("staffBigType")))
            if need_employer and ent_candidates and not r.get("employerId"):
                ent = ent_candidates[(idx + family_index) % len(ent_candidates)]
                r["employerId"] = ent.get("id")
                r["employerName"] = ent.get("name")
            elif not r.get("employerName") and r.get("employerId"):
                matched = next((e for e in enterprises if e.get("id") == r.get("employerId")), None)
                if matched:
                    r["employerName"] = matched.get("name", "")

            r["place"] = r.get("place") or village
            _normalize_resident_logic(r, h + idx * 31)

    # 兜底：确保每家企业至少有1名关联职工，避免企业档案出现全空关联
    staff_count = {}
    for r in residents:
        eid = r.get("employerId")
        if not eid:
            continue
        staff_count[eid] = staff_count.get(eid, 0) + 1

    unassigned_adults = [r for r in residents if (not r.get("employerId")) and int(r.get("age") or 0) >= 18]
    by_street_unassigned = {}
    for r in unassigned_adults:
        street, _ = _street_village_of_unit(by_id, r.get("unitId"))
        by_street_unassigned.setdefault(street, []).append(r)

    for e in enterprises:
        if staff_count.get(e.get("id"), 0) > 0:
            continue
        estreet, _ = _street_village_of_unit(by_id, e.get("unitId"))
        pool = by_street_unassigned.get(estreet) or unassigned_adults
        if not pool:
            continue
        r = pool.pop(0)
        if r in unassigned_adults:
            unassigned_adults.remove(r)
        r["employerId"] = e.get("id")
        r["employerName"] = e.get("name")
        if not r.get("staffDetailType") or not r.get("staffBigType"):
            detail, big = _pick_staff_detail((_stable_hash(r.get("id")) + _stable_hash(e.get("id"))) * 11)
            r["staffDetailType"] = r.get("staffDetailType") or detail
            r["staffBigType"] = r.get("staffBigType") or big
        staff_count[e.get("id")] = 1

    return residents, enterprises


def _children_map(conn):
    rows = conn.execute("SELECT id,parent_id,name,level FROM org_units").fetchall()
    by_parent = {}
    by_id = {}
    for r in rows:
        d = row_to_dict(r)
        by_id[d["id"]] = d
        by_parent.setdefault(d["parent_id"], []).append(d)
    return by_parent, by_id


def _descendants(by_parent, root_id):
    out = []
    stack = [root_id]
    while stack:
        cur = stack.pop()
        out.append(cur)
        for ch in by_parent.get(cur, []):
            stack.append(ch["id"])
    return out


def _map_resident(r):
    d = row_to_dict(r)
    age = int(d["age"])
    age_group = "16岁及以下" if age <= 16 else ("16-30岁" if age <= 30 else ("31-45岁" if age <= 45 else ("46-60岁" if age <= 60 else "60岁以上")))
    return {
        "id": d["id"],
        "type": "居民",
        "name": d["name"],
        "phone": d["phone"],
        "age": age,
        "ageGroup": age_group,
        "gender": d["gender"],
        "household": d["household"],
        "residence": d["residence"],
        "residenceDetail": d["residence_detail"],
        "insuredPlace": d["insured_place"],
        "thisYearType": d["this_year_type"],
        "thisYearPaid": bool(d["this_year_paid"]),
        "lastYearPaid": bool(d["last_year_paid"]),
        "lastYearLocalPaid": bool(d["last_year_local_paid"]),
        "stockChangeType": d["stock_change_type"],
        "lossReason": d["loss_reason"],
        "pauseFlow": d["pause_flow"],
        "keyGroup": d["key_group"],
        "isHardship": bool(d["is_hardship"]),
        "hardshipType": d["hardship_type"],
        "staffBigType": d["staff_big_type"],
        "staffDetailType": d["staff_detail_type"],
        "hukouAddress": d["household_addr"],
        "livingAddress": d["residence_addr"],
        "reason": d["stock_change_type"] or ("已参保" if d["this_year_paid"] else "未参保"),
        "unitId": d["unit_id"],
        "familyId": "",
        "familyRole": "",
        "employerId": "",
        "employerName": "",
        "isPrimarySecondary": d["key_group"] == "中小学生",
        "isCollege": d["key_group"] == "高校生",
        "duration": 0,
        "place": "",
    }


def _map_enterprise(r):
    d = row_to_dict(r)
    return {
        "id": d["id"],
        "type": "企业",
        "name": d["name"],
        "legalPerson": d["legal_person"],
        "contactPerson": d["contact_person"],
        "phone": d["phone"],
        "regAddress": d["address"],
        "reason": "欠费超3个月" if d["risk"] == "高" else "参保登记未缴费",
        "duration": int(d["duration"]),
        "gapRate": float(d["gap_rate"]),
        "industry": "综合",
        "scale": "中型",
        "unitType": "",
        "industryClass": "",
        "unitNature": "",
        "managementArea": "",
        "staffInsured": bool(d["staff_insured"]),
        "lastMonthStaffInsured": bool(d["last_month_staff_insured"]),
        "risk": d["risk"],
        "place": "",
        "unitId": d["unit_id"],
    }


def _identity_from_role(role):
    mp = {
        "district_leader": "district_leader",
        "street_leader": "street_leader",
        "village_leader": "village_leader",
        "grid_user": "grid_worker",
    }
    return mp.get(role, "district_leader")


def _profile_payload(conn, user):
    unit = row_to_dict(conn.execute("SELECT * FROM org_units WHERE id=?", [user["unit_id"]]).fetchone())
    role = user["role"]
    levels = ["district", "street", "village"] if role == "district_leader" else (["street", "village"] if role == "street_leader" else ["village"])

    street = None
    village = None
    if unit["level"] == "street":
        street = unit["name"]
    elif unit["level"] == "village":
        village = unit["name"]
        p = row_to_dict(conn.execute("SELECT * FROM org_units WHERE id=?", [unit["parent_id"]]).fetchone())
        street = p["name"] if p else None
    elif unit["level"] == "grid":
        v = row_to_dict(conn.execute("SELECT * FROM org_units WHERE id=?", [unit["parent_id"]]).fetchone())
        if v:
            village = v["name"]
            p = row_to_dict(conn.execute("SELECT * FROM org_units WHERE id=?", [v["parent_id"]]).fetchone())
            street = p["name"] if p else None

    return {
        "identity": _identity_from_role(role),
        "label": {"district_leader": "区医保局领导", "street_leader": "镇街社保所分管医保领导", "village_leader": "村居领导", "grid_user": "网格员"}.get(role, role),
        "userName": user["display_name"],
        "unit": unit["name"],
        "roles": ["worker"] if role == "grid_user" else ["leader"],
        "levels": levels,
        "street": street,
        "village": village,
    }


def _build_bootstrap(conn, user, year):
    by_parent, by_id = _children_map(conn)
    root_id = user["unit_id"]
    root = by_id[root_id]
    if root["level"] == "grid":
        root = by_id[root["parent_id"]]
        root_id = root["id"]

    visible_ids = set(_descendants(by_parent, root_id))
    residents = [_map_resident(r) for r in conn.execute(f"SELECT * FROM residents WHERE year=? AND unit_id IN ({','.join(['?'] * len(visible_ids))})", [year] + list(visible_ids)).fetchall()]
    enterprises = [_map_enterprise(e) for e in conn.execute(f"SELECT * FROM enterprises WHERE year=? AND unit_id IN ({','.join(['?'] * len(visible_ids))})", [year] + list(visible_ids)).fetchall()]
    residents, enterprises = _enrich_bootstrap_payload(residents, enterprises, by_id)

    visible_villages = sorted(
        [by_id[uid] for uid in visible_ids if (by_id.get(uid) or {}).get("level") == "village"],
        key=lambda x: x["name"],
    )
    street_village_map = {}
    for v in visible_villages:
        sid = v.get("parent_id")
        if not sid:
            continue
        street_village_map.setdefault(sid, []).append(v)
    for sid in list(street_village_map.keys()):
        street_village_map[sid] = sorted(street_village_map[sid], key=lambda x: x["name"])

    def pick_village_id(unit_id, seed_key, place="", mgmt="", addr=""):
        if not visible_villages:
            return None

        unit = by_id.get(unit_id) or {}
        level = unit.get("level")
        if level == "village":
            return unit_id if any(v["id"] == unit_id for v in visible_villages) else None
        if level == "grid":
            vid = unit.get("parent_id")
            if vid and any(v["id"] == vid for v in visible_villages):
                return vid
            unit = by_id.get(vid) or {}
            level = unit.get("level")

        if level == "street":
            candidates = street_village_map.get(unit.get("id"), [])
        elif level == "district":
            candidates = visible_villages
        else:
            candidates = visible_villages

        if not candidates:
            return None

        if place:
            matched = next((v for v in candidates if v["name"] == place), None)
            if matched:
                return matched["id"]

        text = f"{mgmt or ''} {addr or ''}"
        matched = next((v for v in candidates if v["name"] and v["name"] in text), None)
        if matched:
            return matched["id"]

        road, _, _, _ = _extract_address_parts(addr)
        road = _normalize_road_name(road, _stable_hash(seed_key))
        community = ROAD_COMMUNITY_MAP.get(road)
        if community:
            matched = next((v for v in candidates if v["name"] == community), None)
            if matched:
                return matched["id"]

        return candidates[_stable_hash(seed_key) % len(candidates)]["id"]

    res_by_unit = {}
    for r in residents:
        vid = pick_village_id(
            r.get("unitId"),
            r.get("id"),
            place=r.get("place", ""),
            addr=r.get("livingAddress") or r.get("hukouAddress") or "",
        )
        if not vid:
            continue
        res_by_unit.setdefault(vid, []).append(r)

    ent_by_unit = {}
    for e in enterprises:
        vid = pick_village_id(
            e.get("unitId"),
            e.get("id"),
            place=e.get("place", ""),
            mgmt=e.get("managementArea", ""),
            addr=e.get("regAddress") or "",
        )
        if not vid:
            continue
        ent_by_unit.setdefault(vid, []).append(e)

    def village_payload(v):
        vr = list(res_by_unit.get(v["id"], []))
        ve = list(ent_by_unit.get(v["id"], []))
        for x in vr:
            x["place"] = v["name"]
        for x in ve:
            x["place"] = v["name"]
        current = sum(1 for x in vr if x["thisYearPaid"])
        target = max(round(len(vr) * 0.92), current)
        return {"name": v["name"], "target": target, "current": current, "residents": vr, "enterprises": ve}

    streets = []
    district_name = "重庆市九龙坡区"
    if root["level"] == "district":
        district_name = root["name"]
        for s in sorted([x for x in by_parent.get(root["id"], []) if x["level"] == "street"], key=lambda x: x["name"]):
            villages = sorted([x for x in by_parent.get(s["id"], []) if x["level"] == "village"], key=lambda x: x["name"])
            streets.append({"name": s["name"], "villages": [village_payload(v) for v in villages]})
    elif root["level"] == "street":
        p = by_id.get(root["parent_id"])
        district_name = p["name"] if p else district_name
        villages = sorted([x for x in by_parent.get(root["id"], []) if x["level"] == "village"], key=lambda x: x["name"])
        streets.append({"name": root["name"], "villages": [village_payload(v) for v in villages]})
    elif root["level"] == "village":
        sp = by_id.get(root["parent_id"])
        dp = by_id.get(sp["parent_id"]) if sp else None
        district_name = dp["name"] if dp else district_name
        streets.append({"name": sp["name"] if sp else "所属镇街", "villages": [village_payload(root)]})

    return {"district": district_name, "streets": streets}


class Handler(BaseHTTPRequestHandler):
    def _json(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        n = int(self.headers.get("Content-Length", "0"))
        if n <= 0:
            return {}
        raw = self.rfile.read(n)
        return json.loads(raw.decode("utf-8"))

    def _unauth(self, msg="unauthorized"):
        self._json(401, {"ok": False, "message": msg})

    def _auth_user(self):
        auth = self.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return None
        payload = verify_token(auth.split(" ", 1)[1])
        if not payload:
            return None
        conn = get_conn()
        try:
            row = conn.execute("SELECT * FROM users WHERE id=? AND enabled=1", [payload["uid"]]).fetchone()
            return row_to_dict(row)
        finally:
            conn.close()

    def do_OPTIONS(self):
        self._json(200, {"ok": True})

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/api/auth/login":
            data = self._body()
            conn = get_conn()
            try:
                row = conn.execute(
                    "SELECT * FROM users WHERE username=? AND password=? AND enabled=1",
                    [data.get("username", ""), data.get("password", "")],
                ).fetchone()
                if not row:
                    return self._unauth("用户名或密码错误")
                user = row_to_dict(row)
                token = issue_token(user["id"], user["role"], user["unit_id"])
                unit = conn.execute("SELECT id,name,level FROM org_units WHERE id=?", [user["unit_id"]]).fetchone()
                return self._json(
                    200,
                    {
                        "ok": True,
                        "token": token,
                        "user": {
                            "id": user["id"],
                            "username": user["username"],
                            "name": user["display_name"],
                            "role": user["role"],
                            "unit": row_to_dict(unit),
                        },
                    },
                )
            finally:
                conn.close()

        return self._json(404, {"ok": False, "message": "not found"})

    def do_GET(self):
        path = urlparse(self.path).path
        qs = parse_qs(urlparse(self.path).query)

        if path == "/api/health":
            return self._json(200, {"ok": True, "service": "dashboard-backend"})

        if path == "/api/auth/profile":
            user = self._auth_user()
            if not user:
                return self._unauth()
            conn = get_conn()
            try:
                unit = conn.execute("SELECT id,name,level FROM org_units WHERE id=?", [user["unit_id"]]).fetchone()
                return self._json(
                    200,
                    {
                        "ok": True,
                        "user": {
                            "id": user["id"],
                            "username": user["username"],
                            "name": user["display_name"],
                            "role": user["role"],
                            "unit": row_to_dict(unit),
                        },
                    },
                )
            finally:
                conn.close()

        if path.startswith("/api/"):
            user = self._auth_user()
            if not user:
                return self._unauth()

            year = int(qs.get("year", ["2026"])[0])
            requested_unit_id = qs.get("unit_id", [None])[0]

            conn = get_conn()
            try:
                scope = resolve_scope(conn, user, requested_unit_id)
                if scope is None:
                    return self._json(403, {"ok": False, "message": "无权查看该层级数据"})

                residents = [row_to_dict(r) for r in conn.execute(
                    f"SELECT * FROM residents WHERE year=? AND unit_id IN ({','.join(['?']*len(scope))})",
                    [year] + scope,
                ).fetchall()]
                enterprises = [row_to_dict(r) for r in conn.execute(
                    f"SELECT * FROM enterprises WHERE year=? AND unit_id IN ({','.join(['?']*len(scope))})",
                    [year] + scope,
                ).fetchall()]

                if path == "/api/metrics/core":
                    return self._json(200, {"ok": True, "data": compute_core_metrics(residents)})

                if path == "/api/metrics/age":
                    return self._json(200, {"ok": True, "data": compute_age_metrics(residents)})

                if path == "/api/metrics/staff":
                    return self._json(200, {"ok": True, "data": compute_staff_metrics(residents, enterprises)})

                if path == "/api/metrics/risk":
                    return self._json(200, {"ok": True, "data": compute_risk_metrics(residents, enterprises)})

                if path == "/api/list/residents":
                    filters = {
                        "name": qs.get("name", [""])[0],
                        "phone": qs.get("phone", [""])[0],
                        "address": qs.get("address", [""])[0],
                        "household": qs.get("household", [""])[0],
                        "residence": qs.get("residence", [""])[0],
                        "residence_detail": qs.get("residence_detail", [""])[0],
                        "insured_place": qs.get("insured_place", [""])[0],
                        "this_year_type": qs.get("this_year_type", [""])[0],
                        "stock_change_type": qs.get("stock_change_type", [""])[0],
                        "loss_reason": qs.get("loss_reason", [""])[0],
                        "pause_flow": qs.get("pause_flow", [""])[0],
                        "key_group": qs.get("key_group", [""])[0],
                        "hardship_type": qs.get("hardship_type", [""])[0],
                        "staff_big_type": qs.get("staff_big_type", [""])[0],
                        "staff_detail_type": qs.get("staff_detail_type", [""])[0],
                        "gender": qs.get("gender", [""])[0],
                        "limit": int(qs.get("limit", ["100"])[0]),
                        "offset": int(qs.get("offset", ["0"])[0]),
                    }
                    rows, total = query_residents(conn, scope, year, filters)
                    return self._json(200, {"ok": True, "total": total, "items": [row_to_dict(r) for r in rows]})

                if path == "/api/list/enterprises":
                    filters = {
                        "name": qs.get("name", [""])[0],
                        "contact_person": qs.get("contact_person", [""])[0],
                        "address": qs.get("address", [""])[0],
                        "risk": qs.get("risk", [""])[0],
                        "staff_insured": qs.get("staff_insured", [""])[0],
                        "limit": int(qs.get("limit", ["100"])[0]),
                        "offset": int(qs.get("offset", ["0"])[0]),
                    }
                    rows, total = query_enterprises(conn, scope, year, filters)
                    return self._json(200, {"ok": True, "total": total, "items": [row_to_dict(r) for r in rows]})

                if path == "/api/dictionary/filters":
                    return self._json(
                        200,
                        {
                            "ok": True,
                            "data": {
                                "对象类型": ["居民", "企业"],
                                "居民户籍": ["本区户籍", "非本区户籍"],
                                "居民居住": ["本区居住", "外区居住"],
                                "居民居住细分": ["本辖区", "区内其他辖区", "市内外区", "市外"],
                                "参保地": ["本区县参保", "市内外区参保", "市外参保"],
                                "今年参保类型": ["居民保", "职工保", "未参保"],
                                "存量变化类型": ["存量续保", "可动员", "停保", "死亡", "辖区外参保", "转职工保（含灵活就业参保）"],
                                "存量减员原因": ["死亡", "辖区外参保", "停保", "转职工保（含灵活就业参保）"],
                                "职工减员流向": ["转居民保", "申请停保", "跨区转出"],
                                "重点对象": ["新生儿", "中小学生", "高校生", "资助对象"],
                                "资助对象细类": ["低保对象", "残疾对象", "特困对象"],
                                "职工参保大类": ["单位参保", "个人参保（灵活就业）"],
                                "职工参保细类": ["在职职工", "单位退休人员", "灵活就业（一档）", "灵活就业（二档）", "个人退休（一档）", "个人退休（二档）"],
                                "企业风险等级": ["高", "中", "低"],
                                "单位参保状态": ["参加职工保", "未参加职工保"],
                                "居民性别": ["男", "女"],
                            },
                        },
                    )

                if path == "/api/bootstrap":
                    profile = _profile_payload(conn, user)
                    dashboard = _build_bootstrap(conn, user, year)
                    return self._json(200, {"ok": True, "profile": profile, "dashboard": dashboard})

                return self._json(404, {"ok": False, "message": "not found"})
            finally:
                conn.close()

        return self._json(404, {"ok": False, "message": "not found"})


def run():
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"dashboard backend listening on http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    run()
