import json
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


def row_to_dict(row):
    return dict(row) if row is not None else None


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

    res_by_unit = {}
    for r in residents:
        res_by_unit.setdefault(r["unitId"], []).append(r)
    ent_by_unit = {}
    for e in enterprises:
        ent_by_unit.setdefault(e["unitId"], []).append(e)

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
