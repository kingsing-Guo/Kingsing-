#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
全民参保手机看板（反重力版）一键启动脚本
- 在 8787 端口启动后端 API（监听 0.0.0.0，局域网手机可访问）
- 在 8788 端口启动前端静态服务器（监听 0.0.0.0，局域网手机可访问）
- 自动用浏览器打开登录页
"""
import os
import re
import socket
import subprocess
import sys
import time
import webbrowser
from pathlib import Path

BASE = Path(__file__).parent
BACKEND_DIR = BASE / "backend"
FRONTEND_DIR = BASE
BACKEND_PORT = 8787
FRONTEND_PORT = 8788


def get_local_ip():
    """依次尝试各物理网卡，返回真实的局域网 IP。"""
    import subprocess
    # macOS 上优先尝试 en0（WiFi）/ en1 / en2
    for iface in ("en0", "en1", "en2", "en3"):
        try:
            result = subprocess.run(
                ["ipconfig", "getifaddr", iface],
                capture_output=True, text=True, timeout=2
            )
            ip = result.stdout.strip()
            if ip and not ip.startswith("169.254") and not ip.startswith("198."):
                return ip
        except Exception:
            continue
    # 兜底：socket 方式
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


# 检查数据库
DB_PATH = BACKEND_DIR / "data" / "dashboard.db"
if not DB_PATH.exists():
    print(f"❌ 数据库文件不存在：{DB_PATH}")
    print("   请先运行：cd backend && python3 seed_db.py")
    sys.exit(1)

# 若未设置 DASHBOARD_SECRET，使用本地测试临时值
if not os.environ.get("DASHBOARD_SECRET"):
    os.environ["DASHBOARD_SECRET"] = "local-dev-only-secret-do-not-use-in-production"
    print("ℹ️  DASHBOARD_SECRET 未配置，已使用本地测试默认值（仅限本机使用）")

LOCAL_IP = get_local_ip()

print(f"✅ 数据库：{DB_PATH}")
print(f"🚀 后端 API：http://{LOCAL_IP}:{BACKEND_PORT}")
print(f"🌐 前端页面：http://{LOCAL_IP}:{FRONTEND_PORT}")

# 启动后端（0.0.0.0 监听）
backend_proc = subprocess.Popen(
    [sys.executable, "server.py"],
    cwd=str(BACKEND_DIR),
    env=os.environ.copy(),
)

# 启动前端静态服务器（0.0.0.0 监听，局域网可访问）
frontend_proc = subprocess.Popen(
    [sys.executable, "-m", "http.server", str(FRONTEND_PORT)],
    cwd=str(FRONTEND_DIR),
)

time.sleep(1.5)

phone_url = f"http://{LOCAL_IP}:{FRONTEND_PORT}/login.html?apiBase=http://{LOCAL_IP}:{BACKEND_PORT}"
local_url = f"http://127.0.0.1:{FRONTEND_PORT}/login.html?apiBase=http://127.0.0.1:{BACKEND_PORT}"

print(f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💻 本机访问：
   {local_url}

📱 手机访问（需与电脑在同一 WiFi）：
   {phone_url}

   或扫描二维码（在终端中生成）：""")

# 简单的二维码终端输出（用 qrcode 库，没有则跳过）
try:
    import qrcode
    qr = qrcode.QRCode(border=1)
    qr.add_data(phone_url)
    qr.make(fit=True)
    qr.print_ascii(invert=True)
except ImportError:
    print(f"   （若要显示二维码，可运行：pip3 install qrcode）")

print(f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
按 Ctrl+C 停止服务器
""")

webbrowser.open(local_url)

try:
    backend_proc.wait()
except KeyboardInterrupt:
    print("\n⏹  正在停止服务器...")
    backend_proc.terminate()
    frontend_proc.terminate()
    print("✅ 已停止")

