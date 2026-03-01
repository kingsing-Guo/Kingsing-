import base64
import hashlib
import hmac
import json
import os
import time

SECRET = os.getenv("DASHBOARD_SECRET", "dashboard-dev-secret")
TOKEN_TTL = int(os.getenv("DASHBOARD_TOKEN_TTL", "28800"))


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _ub64(text: str) -> bytes:
    pad = "=" * (-len(text) % 4)
    return base64.urlsafe_b64decode(text + pad)


def issue_token(user_id: str, role: str, unit_id: str) -> str:
    payload = {
        "uid": user_id,
        "role": role,
        "unit_id": unit_id,
        "exp": int(time.time()) + TOKEN_TTL,
    }
    raw = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode()
    sig = hmac.new(SECRET.encode(), raw, hashlib.sha256).hexdigest().encode()
    return f"{_b64(raw)}.{_b64(sig)}"


def verify_token(token: str):
    try:
        a, b = token.split(".", 1)
        raw = _ub64(a)
        sig = _ub64(b)
        expected = hmac.new(SECRET.encode(), raw, hashlib.sha256).hexdigest().encode()
        if not hmac.compare_digest(sig, expected):
            return None
        payload = json.loads(raw.decode())
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        return payload
    except Exception:
        return None
