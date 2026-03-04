(function () {
  function normalizeApiBase(v) {
    return (v || "").trim().replace(/\/+$/, "");
  }
  function resolveApiBase() {
    const q = new URLSearchParams(location.search);
    const fromQuery = normalizeApiBase(q.get("apiBase") || "");
    if (fromQuery) { localStorage.setItem("dashboard_api_base", fromQuery); return fromQuery; }
    const fromStorage = normalizeApiBase(localStorage.getItem("dashboard_api_base") || "");
    if (fromStorage) return fromStorage;
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
      return `${location.protocol}//${location.hostname}:8787`;
    }
    return "http://127.0.0.1:8787";
  }
  let API_BASE = resolveApiBase();

  /* 各角色用户名（密码由用户自行输入，不在前端存储）*/
  const ROLE_USERNAMES = {
    district_leader: "district",
    street_leader:   "street",
    village_leader:  "village",
    grid_worker:     "grid"
  };
  const ROLE_LABELS = {
    district_leader: "区医保局领导",
    street_leader:   "镇街分管领导",
    village_leader:  "村居领导",
    grid_worker:     "网格员"
  };

  /* ---- API 地址配置弹窗 ---- */
  const apiModal   = document.getElementById("apiModal");
  const apiInput   = document.getElementById("apiInput");
  const apiCurrent = document.getElementById("apiCurrent");

  function openApiModal() {
    apiCurrent.textContent = `当前后端地址：${API_BASE}`;
    apiInput.value = API_BASE;
    apiModal.classList.add("show");
    setTimeout(() => apiInput.focus(), 0);
  }
  function closeApiModal() { apiModal.classList.remove("show"); }

  document.getElementById("apiSetBtn").onclick    = openApiModal;
  document.getElementById("apiCancelBtn").onclick = closeApiModal;
  document.getElementById("apiSaveBtn").onclick   = () => {
    const val = normalizeApiBase(apiInput.value);
    if (!val) return;
    API_BASE = val;
    localStorage.setItem("dashboard_api_base", API_BASE);
    closeApiModal();
    alert(`后端地址已设置为：${API_BASE}`);
  };
  apiModal.onclick = (e) => { if (e.target === apiModal) closeApiModal(); };

  /* ---- 密码输入弹窗 ---- */
  const pwdModal     = document.getElementById("pwdModal");
  const pwdInput     = document.getElementById("pwdInput");
  const pwdRoleLabel = document.getElementById("pwdRoleLabel");
  const pwdErrMsg    = document.getElementById("pwdErrMsg");
  let _pendingId = null, _pendingGoEl = null, _pendingGoText = "", _pendingBtn = null;

  function openPwdModal(identity, goEl, btn) {
    _pendingId = identity; _pendingGoEl = goEl;
    _pendingGoText = goEl.textContent; _pendingBtn = btn;
    pwdRoleLabel.textContent = `登录角色：${ROLE_LABELS[identity] || identity}`;
    pwdInput.value = "";
    pwdErrMsg.textContent = "";
    pwdModal.classList.add("show");
    setTimeout(() => pwdInput.focus(), 50);
  }
  function closePwdModal() {
    pwdModal.classList.remove("show");
    if (_pendingGoEl) _pendingGoEl.textContent = _pendingGoText;
    if (_pendingBtn)  _pendingBtn.disabled = false;
    _pendingId = null; _pendingGoEl = null; _pendingBtn = null;
  }

  async function doLogin(identity, password) {
    const username = ROLE_USERNAMES[identity];
    if (!username) throw new Error("未配置登录账号");
    const resp = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const json = await resp.json();
    if (!resp.ok || !json.ok || !json.token) throw new Error(json.message || "登录失败");
    localStorage.setItem("dashboard_session", JSON.stringify({
      token: json.token, identity,
      user: json.user || null, apiBase: API_BASE, loginAt: Date.now()
    }));
    location.href = `./index.html?identity=${encodeURIComponent(identity)}`;
  }

  document.getElementById("pwdConfirmBtn").onclick = async () => {
    const password = pwdInput.value;
    if (!password) { pwdInput.focus(); return; }
    if (!_pendingId) return;
    _pendingGoEl.textContent = "登录中...";
    _pendingBtn.disabled = true;
    pwdModal.classList.remove("show");
    try {
      await doLogin(_pendingId, password);
    } catch (e) {
      pwdModal.classList.add("show");
      pwdErrMsg.textContent = `登录失败：${e.message}`;
      _pendingGoEl.textContent = _pendingGoText;
      _pendingBtn.disabled = false;
    }
  };
  document.getElementById("pwdCancelBtn").onclick = closePwdModal;
  pwdModal.onclick = (e) => { if (e.target === pwdModal) closePwdModal(); };
  pwdInput.onkeydown = (e) => {
    if (e.key === "Enter") document.getElementById("pwdConfirmBtn").click();
  };

  /* ---- 角色卡片点击 → 打开密码弹窗 ---- */
  document.querySelectorAll(".entry").forEach(el => {
    el.onclick = () => openPwdModal(el.dataset.id, el.querySelector(".go"), el);
  });
})();
