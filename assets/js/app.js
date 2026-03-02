// app.js — Key Manager

const API = "/.netlify/functions/api";

let currentUser = null;
let statusTimer = null;
let activeHwidKeyId = null;
let activeHwidValue = null;
let activeHwidBanned = false;
let activeEditKeyId = null;
let activeEditAppId = null;
let showAllKeys = false;
let selectedFile = null;
let selectedAppId = null;
let selectedAppName = null;

const DURATION_LABELS = { day: "1 Day", week: "7 Days", month: "30 Days", lifetime: "Lifetime" };
const STATUS_ICONS = { active: "🟢", paused: "🟡", maintenance: "🔧" };
const APP_EMOJIS = ["🚀", "⚡", "🎮", "🤖", "🛠", "💻", "🔥", "🌐", "🎯", "💎", "🦾", "🧠"];

// ─── API ──────────────────────────────────────────────────────────────────────
async function callAPI(action, payload = {}) {
    const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
    });
    return res.json();
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function setStatus(msg, type = "success") {
    const bar = document.getElementById("statusBar");
    bar.textContent = (type === "success" ? "✓  " : "✗  ") + msg;
    bar.className = "status-bar show " + type;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => bar.classList.remove("show"), 3200);
}

// ─── MODALS ───────────────────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.add("open"); }
function closeModal(id) { document.getElementById(id).classList.remove("open"); }

function showConfirm(title, msg, okLabel, okClass, onOk) {
    document.getElementById("confirmTitle").textContent = title;
    document.getElementById("confirmMsg").textContent = msg;
    const btn = document.getElementById("confirmOkBtn");
    btn.textContent = okLabel;
    btn.className = "btn-sm " + okClass;
    btn.onclick = () => { closeModal("confirmModal"); onOk(); };
    openModal("confirmModal");
}

// ─── AUTH TAB SWITCH ──────────────────────────────────────────────────────────
function switchAuthTab(mode) {
    const isReg = mode === "register";
    document.getElementById("loginTitle").style.display = isReg ? "none" : "block";
    document.getElementById("registerTitle").style.display = isReg ? "block" : "none";
    document.getElementById("loginForm").style.display = isReg ? "none" : "block";
    document.getElementById("registerForm").style.display = isReg ? "block" : "none";
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
async function login() {
    const btn = document.getElementById("loginBtn");
    const username = document.getElementById("loginUser").value.trim();
    const password = document.getElementById("loginPass").value;
    if (!username || !password) return;
    btn.disabled = true; btn.textContent = "Signing in...";
    try {
        const res = await callAPI("login", { username, password });
        if (res.ok) { currentUser = res.user; setupUI(); }
        else setStatus(res.error || "Invalid credentials", "error");
    } catch { setStatus("Login failed — check connection", "error"); }
    finally { btn.disabled = false; btn.textContent = "Sign In →"; }
}

async function register() {
    const btn = document.getElementById("registerBtn");
    const name = document.getElementById("regName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const username = document.getElementById("regUser").value.trim();
    const password = document.getElementById("regPass").value;
    const passwordConfirm = document.getElementById("regPassConfirm").value;
    if (!name || !email || !username || !password) { setStatus("Please fill all fields", "error"); return; }
    if (password !== passwordConfirm) { setStatus("Passwords do not match", "error"); return; }
    if (password.length < 6) { setStatus("Password must be at least 6 characters", "error"); return; }
    btn.disabled = true; btn.textContent = "Creating account...";
    try {
        const res = await callAPI("register", { name, email, username, password });
        if (res.ok) { currentUser = res.user; setStatus(`Welcome, ${username}!`); setupUI(); }
        else setStatus(res.error || "Registration failed", "error");
    } catch { setStatus("Registration failed", "error"); }
    finally { btn.disabled = false; btn.textContent = "Create Account →"; }
}

function setupUI() {
    document.getElementById("loginView").classList.remove("active");
    const mainView = document.getElementById("mainView");
    mainView.style.display = "flex"; // Hard override for the new layout
    mainView.classList.add("active");

    const name = currentUser.username || "User";
    document.getElementById("userNameDisplay").textContent = name;
    document.getElementById("avatarLetter").textContent = name.charAt(0).toUpperCase();
    document.getElementById("userRoleDisplay").textContent = currentUser.is_admin ? "admin" : "seller";
    document.querySelectorAll(".admin-only").forEach(el => el.style.display = currentUser.is_admin ? "" : "none");
    if (currentUser.is_admin) fetchSellers();
    fetchApps();
}

function logout() {
    currentUser = null; showAllKeys = false; selectedAppId = null; selectedAppName = null;
    document.getElementById("loginView").classList.add("active");
    const mainView = document.getElementById("mainView");
    mainView.style.display = "none";
    mainView.classList.remove("active");
    document.getElementById("loginPass").value = "";
    document.getElementById("showAllToggle")?.classList.remove("on");
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
function switchTab(tab) {
    document.querySelectorAll(".nav-item").forEach(t => t.classList.remove("active"));
    document.querySelector(`.nav-item[data-tab="${tab}"]`)?.classList.add("active");
    ["appsTab", "keysTab", "adminTab"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
    });
    if (tab === "apps") { document.getElementById("appsTab").style.display = "block"; fetchApps(); }
    else if (tab === "keys") { document.getElementById("keysTab").style.display = "block"; initKeysTab(); }
    else if (tab === "admin") { document.getElementById("adminTab").style.display = "block"; }
}

// ─── APPLICATIONS ─────────────────────────────────────────────────────────────
async function fetchApps() {
    const list = document.getElementById("appList");
    list.innerHTML = '<div class="loading"><div class="spinner"></div> Loading apps...</div>';
    try {
        const res = await callAPI("getApps", { isAdmin: currentUser.is_admin, sellerId: currentUser.id });
        list.innerHTML = "";
        if (!res.data || !res.data.length) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <div class="empty-state-title">No applications yet</div>
                    <div class="empty-state-sub">Create your first application to start managing license keys</div>
                    <button class="btn-primary btn-sm" style="margin-top:16px" onclick="openCreateAppModal()">+ Create Application</button>
                </div>`;
            return;
        }
        // Populate app selector in keys tab too
        populateAppSelector(res.data);
        res.data.forEach(app => renderAppCard(app, list));
    } catch { setStatus("Failed to load apps", "error"); }
}

function renderAppCard(app, container) {
    const emoji = APP_EMOJIS[app.name.charCodeAt(0) % APP_EMOJIS.length];
    const statusLabel = app.status || "active";
    const el = document.createElement("div");
    el.className = "app-card";
    el.dataset.appId = app.id;
    el.dataset.appName = app.name;
    el.innerHTML = `
        <div class="app-card-icon">${emoji}</div>
        <div style="flex:1;min-width:0">
            <div class="app-card-name">${app.name}</div>
            ${app.description ? `<div class="app-card-desc">${app.description}</div>` : ""}
            <div class="app-card-meta" style="margin-top:6px">
                <span class="app-status ${statusLabel}">${STATUS_ICONS[statusLabel]} ${statusLabel}</span>
                ${app.is_admin_only ? `<span class="meta-chip" style="color:var(--warning);background:rgba(255,179,64,0.1)">🔒 Admin Only</span>` : ""}
                ${app.version ? `<span class="app-version">v${app.version}</span>` : ""}
                <span class="app-key-count">🗝 ${app.key_count || 0} keys</span>
            </div>
        </div>
        <div class="item-actions">
            <button class="btn-primary btn-sm" data-open-keys="${app.id}" data-open-keys-name="${app.name}">Manage Keys →</button>
            <button class="btn-ghost btn-sm" data-edit-app='${JSON.stringify(app)}'>✏️</button>
            <button class="btn-danger btn-sm" data-delete-app="${app.id}" data-delete-app-name="${app.name}">Delete</button>
        </div>`;
    container.appendChild(el);
}

function populateAppSelector(apps) {
    // Keys tab selector
    const sel = document.getElementById("appSelector");
    const current = sel.value;
    sel.innerHTML = '<option value="">— Select an application —</option>';
    apps.forEach(a => {
        const opt = document.createElement("option");
        opt.value = a.id;
        opt.textContent = a.name;
        sel.appendChild(opt);
    });
    if (current) sel.value = current;
}

// ─── APP MODAL ────────────────────────────────────────────────────────────────
function openCreateAppModal() {
    activeEditAppId = null;
    document.getElementById("appModalTitle").textContent = "📦 New Application";
    document.getElementById("saveAppBtn").textContent = "Create Application";
    document.getElementById("appName").value = "";
    document.getElementById("appDescription").value = "";
    document.getElementById("appVersion").value = "1.0.0";
    document.getElementById("appStatus").value = "active";
    document.getElementById("appIsAdminOnly").checked = false;
    openModal("appModal");
    setTimeout(() => document.getElementById("appName").focus(), 100);
}

function openEditAppModal(app) {
    activeEditAppId = app.id;
    document.getElementById("appModalTitle").textContent = "✏️ Edit Application";
    document.getElementById("saveAppBtn").textContent = "Save Changes";
    document.getElementById("appName").value = app.name || "";
    document.getElementById("appDescription").value = app.description || "";
    document.getElementById("appVersion").value = app.version || "1.0.0";
    document.getElementById("appStatus").value = app.status || "active";
    document.getElementById("appIsAdminOnly").checked = app.is_admin_only || false;
    openModal("appModal");
}

async function saveApp() {
    const name = document.getElementById("appName").value.trim();
    const description = document.getElementById("appDescription").value.trim();
    const version = document.getElementById("appVersion").value.trim();
    const status = document.getElementById("appStatus").value;
    const is_admin_only = document.getElementById("appIsAdminOnly").checked;
    if (!name) { setStatus("App name is required", "error"); return; }

    const btn = document.getElementById("saveAppBtn");
    btn.disabled = true;
    try {
        let res;
        if (activeEditAppId) {
            res = await callAPI("updateApp", { id: activeEditAppId, name, description, version, status, is_admin_only });
        } else {
            res = await callAPI("createApp", { name, description, version, status, is_admin_only, seller_id: currentUser.id });
        }
        if (res.ok) {
            closeModal("appModal");
            setStatus(activeEditAppId ? "App updated!" : `App "${name}" created!`);
            fetchApps();
        } else {
            setStatus("Failed to save app", "error");
        }
    } catch { setStatus("Failed to save app", "error"); }
    finally { btn.disabled = false; }
}

async function deleteApp(id) {
    const res = await callAPI("deleteApp", { id });
    if (res.ok) { setStatus("Application deleted"); fetchApps(); }
    else setStatus("Failed to delete app", "error");
}

// ─── KEYS TAB INIT ────────────────────────────────────────────────────────────
function initKeysTab() {
    const hasApp = !!selectedAppId;
    document.getElementById("keysContent").style.display = hasApp ? "block" : "none";
    document.getElementById("noAppSelected").style.display = hasApp ? "none" : "block";
    document.getElementById("showAllRow").style.display = (hasApp && currentUser.is_admin) ? "block" : "none";
    if (hasApp) fetchKeys();
    // Sync selector
    const sel = document.getElementById("appSelector");
    if (selectedAppId) sel.value = selectedAppId;
}

function openKeysForApp(appId, appName) {
    selectedAppId = appId;
    selectedAppName = appName;
    switchTab("keys");
}

// ─── SHOW ALL TOGGLE ──────────────────────────────────────────────────────────
function toggleShowAll() {
    showAllKeys = !showAllKeys;
    document.getElementById("showAllToggle").classList.toggle("on", showAllKeys);
    document.getElementById("showAllHint").textContent = showAllKeys ? "All Seller · Keys" : "Only own Keys";
    fetchKeys();
}

// ─── KEYS ─────────────────────────────────────────────────────────────────────
async function fetchKeys() {
    if (!selectedAppId) return;
    const keyList = document.getElementById("keyList");
    keyList.innerHTML = '<div class="loading"><div class="spinner"></div> Loading keys...</div>';
    try {
        const res = await callAPI("getKeys", {
            appId: selectedAppId,
            isAdmin: currentUser.is_admin,
            sellerId: currentUser.id,
            showAll: showAllKeys,
        });
        keyList.innerHTML = "";
        const badge = document.getElementById("showAllCount");
        if (!res.data || !res.data.length) {
            keyList.innerHTML = `<div class="empty">No keys for this application yet.<br><span style="font-size:0.75rem;opacity:0.6">Click "+ Generate Key" to create one.</span></div>`;
            if (badge) badge.textContent = "0";
            return;
        }
        if (badge) badge.textContent = res.data.length;
        res.data.forEach(item => renderKeyItem(item, keyList));
    } catch { setStatus("Failed to load keys", "error"); }
}

function renderKeyItem(item, container) {
    const isBanned = item.hwid_banned === true;
    const isActive = item.is_active !== false;
    const el = document.createElement("div");
    el.className = "list-item" + (isBanned ? " banned-item" : "");

    let hwidChip = "";
    if (item.hwid) {
        const display = item.hwid.length > 32 ? item.hwid.slice(0, 14) + "···" + item.hwid.slice(-10) : item.hwid;
        hwidChip = `<span class="meta-chip chip-hwid${isBanned ? " is-banned" : ""}" data-hwid-key="${item.id}" data-hwid="${encodeURIComponent(item.hwid)}" data-banned="${isBanned}" title="${item.hwid}">${isBanned ? "🚫" : "🖥"} ${display}</span>`;
    } else {
        hwidChip = `<span class="meta-chip chip-no-hwid">No HWID</span>`;
    }

    const userChip = item.bound_user ? `<span class="meta-chip chip-seller" style="background:rgba(182,109,255,0.1);color:#b66dff;border-color:rgba(182,109,255,0.2)">👤 User: ${item.bound_user}</span>` : "";
    const noteTxt = item.note ? `<span class="meta-chip chip-note" title="${item.note}">📝 ${item.note.slice(0, 28)}${item.note.length > 28 ? "…" : ""}</span>` : "";
    const bannedBadge = isBanned ? `<span class="banned-badge">🚫 HWID BANNED</span>` : "";
    const statusChip = isActive
        ? `<span class="meta-chip" style="color:var(--success);border-color:rgba(48,217,128,0.2);background:rgba(48,217,128,0.05)">● Active</span>`
        : `<span class="meta-chip" style="color:var(--danger);border-color:rgba(255,79,106,0.2);background:rgba(255,79,106,0.05)">● Inactive</span>`;
    const sellerChip = item.seller_name ? `<span class="meta-chip chip-seller">👤 ${item.seller_name}</span>` : "";

    el.innerHTML = `
        <div style="min-width:0;flex:1">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:5px">
                <div class="key-string">${item.key}</div>${bannedBadge}
            </div>
            <div class="key-meta">
                ${statusChip}${sellerChip}
                <span class="meta-chip">⏱ ${DURATION_LABELS[item.duration] || item.duration || "N/A"}</span>
                <span class="meta-chip">📅 ${new Date(item.created_at).toLocaleDateString("de-DE")}</span>
                ${userChip}${hwidChip}${noteTxt}
            </div>
        </div>
        <div class="item-actions">
            <button class="btn-ghost btn-sm" data-edit-key='${JSON.stringify(item)}'>✏️</button>
            <button class="btn-danger btn-sm" data-delete-key="${item.id}" data-delete-label="${item.key}">Delete</button>
        </div>`;
    container.appendChild(el);
}

async function generateKey() {
    if (!selectedAppId) { setStatus("Please select an application first", "error"); return; }
    const duration = document.getElementById("keyDuration").value;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let newKey = "";
    for (let i = 0; i < 16; i++) {
        if (i > 0 && i % 4 === 0) newKey += "-";
        newKey += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    try {
        const res = await callAPI("createKey", { key: newKey, is_active: true, duration, seller_id: currentUser.id, app_id: selectedAppId });
        if (res.ok) { setStatus("Key generated!"); fetchKeys(); }
        else setStatus("Failed to generate key", "error");
    } catch { setStatus("Failed to generate key", "error"); }
}

async function deleteKey(id) {
    const res = await callAPI("deleteKey", { id });
    if (res.ok) { setStatus("Key deleted"); fetchKeys(); }
    else setStatus("Failed to delete key", "error");
}

// ─── EDIT KEY ─────────────────────────────────────────────────────────────────
function openEditModal(item) {
    activeEditKeyId = item.id;
    document.getElementById("editKeyString").value = item.key;
    document.getElementById("editKeyDuration").value = item.duration || "day";
    document.getElementById("editKeyNote").value = item.note || "";
    document.getElementById("editKeyActive").checked = item.is_active !== false;
    openModal("editModal");
}

async function saveKeyEdit() {
    const btn = document.getElementById("saveEditBtn");
    btn.disabled = true;
    try {
        const res = await callAPI("updateKey", {
            id: activeEditKeyId,
            duration: document.getElementById("editKeyDuration").value,
            note: document.getElementById("editKeyNote").value.trim(),
            is_active: document.getElementById("editKeyActive").checked,
        });
        if (res.ok) { closeModal("editModal"); setStatus("Key updated!"); fetchKeys(); }
        else setStatus("Failed to save", "error");
    } catch { setStatus("Failed to save", "error"); }
    finally { btn.disabled = false; }
}

// ─── HWID ─────────────────────────────────────────────────────────────────────
function openHwidModal(keyId, hwid, isBanned) {
    activeHwidKeyId = keyId; activeHwidValue = hwid; activeHwidBanned = isBanned;
    const display = document.getElementById("hwidDisplay");
    display.textContent = hwid;
    display.className = "hwid-display" + (isBanned ? " is-banned" : "");
    document.getElementById("hwidStatusMsg").innerHTML = isBanned
        ? `<span style="color:var(--banned)">🚫 Dieses Gerät ist gesperrt.</span>`
        : `<span style="color:var(--success)">✓ Gerät aktiv. Klicke auf die HWID zum Kopieren.</span>`;
    document.getElementById("hwidBanBtn").style.display = isBanned ? "none" : "";
    document.getElementById("hwidUnbanBtn").style.display = isBanned ? "" : "none";
    openModal("hwidModal");
}

async function resetHWID() {
    const res = await callAPI("updateKey", { id: activeHwidKeyId, hwid: null, hwid_banned: false });
    if (res.ok) { closeModal("hwidModal"); setStatus("HWID reset"); fetchKeys(); }
    else setStatus("Failed", "error");
}
async function banHWID() {
    const res = await callAPI("updateKey", { id: activeHwidKeyId, hwid_banned: true });
    if (res.ok) { closeModal("hwidModal"); setStatus("HWID banned", "error"); fetchKeys(); }
}
async function unbanHWID() {
    const res = await callAPI("updateKey", { id: activeHwidKeyId, hwid_banned: false });
    if (res.ok) { closeModal("hwidModal"); setStatus("HWID unbanned"); fetchKeys(); }
}
function copyHwid() {
    if (!activeHwidValue) return;
    navigator.clipboard.writeText(activeHwidValue).then(() => setStatus("HWID copied!"));
}

// ─── USERS ────────────────────────────────────────────────────────────────────
async function addSeller() {
    const username = document.getElementById("newSellerUser").value.trim();
    const password = document.getElementById("newSellerPass").value;
    const is_admin = document.getElementById("newSellerIsAdmin").checked;
    if (!username || !password) { setStatus("Username and password required", "error"); return; }
    const btn = document.getElementById("addSellerBtn");
    btn.disabled = true;
    try {
        const res = await callAPI("createSeller", { username, password, is_admin });
        if (res.ok) {
            setStatus(`${is_admin ? "Admin" : "Seller"} "${username}" added!`);
            document.getElementById("newSellerUser").value = "";
            document.getElementById("newSellerPass").value = "";
            document.getElementById("newSellerIsAdmin").checked = false;
            fetchSellers();
        } else setStatus("Error adding user", "error");
    } catch { setStatus("Network error", "error"); }
    finally { btn.disabled = false; }
}

async function fetchSellers() {
    const userList = document.getElementById("userList");
    userList.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    try {
        const res = await callAPI("getSellers");
        userList.innerHTML = "";
        if (!res.data?.length) { userList.innerHTML = '<div class="empty">No users found.</div>'; return; }
        res.data.forEach(u => {
            const isMe = u.id === currentUser.id;
            const el = document.createElement("div");
            el.className = "list-item";
            el.innerHTML = `
                <div class="user-badge">
                    <div class="avatar" style="${u.is_admin ? "background:linear-gradient(135deg,#ffb340,#ff6b35)" : ""}">${u.username.charAt(0).toUpperCase()}</div>
                    <div>
                        <div class="user-name">${u.username} ${isMe ? '<span style="font-size:0.65rem;color:var(--text-muted)">(You)</span>' : ""}</div>
                        <div class="user-role" style="${u.is_admin ? "color:var(--warning)" : ""}">${u.is_admin ? "★ admin" : "seller"}</div>
                    </div>
                </div>
                <div class="item-actions">${!isMe ? `<button class="btn-danger btn-sm" data-delete-seller="${u.id}" data-delete-seller-name="${u.username}">Delete</button>` : ""}</div>`;
            userList.appendChild(el);
        });
    } catch { console.error("Failed to load users"); }
}

async function deleteSeller(id) {
    const res = await callAPI("deleteSeller", { id });
    if (res.ok) { setStatus("User deleted"); fetchSellers(); }
    else setStatus("Failed", "error");
}

// ─── EVENT DELEGATION ─────────────────────────────────────────────────────────
document.addEventListener("click", e => {
    const closeBtn = e.target.closest("[data-close]");
    if (closeBtn) { closeModal(closeBtn.dataset.close); return; }
    if (e.target.classList.contains("modal-overlay")) { e.target.classList.remove("open"); return; }
    if (e.target.closest("#showAllToggle")) { toggleShowAll(); return; }

    // Auth tabs
    const authEl = e.target.closest("[data-auth]");
    if (authEl) { switchAuthTab(authEl.dataset.auth); return; }

    // Open keys for app
    const openKeysBtn = e.target.closest("[data-open-keys]");
    if (openKeysBtn) { openKeysForApp(openKeysBtn.dataset.openKeys, openKeysBtn.dataset.openKeysName); return; }

    // Edit app
    const editAppBtn = e.target.closest("[data-edit-app]");
    if (editAppBtn) { try { openEditAppModal(JSON.parse(editAppBtn.dataset.editApp)); } catch { } return; }

    // Delete app
    const deleteAppBtn = e.target.closest("[data-delete-app]");
    if (deleteAppBtn) { showConfirm("Delete App", `Delete "${deleteAppBtn.dataset.deleteAppName}" and ALL its keys?`, "Delete", "btn-danger", () => deleteApp(deleteAppBtn.dataset.deleteApp)); return; }

    // HWID chip
    const hwidChip = e.target.closest("[data-hwid-key]");
    if (hwidChip) { openHwidModal(hwidChip.dataset.hwidKey, decodeURIComponent(hwidChip.dataset.hwid), hwidChip.dataset.banned === "true"); return; }

    // Edit key
    const editBtn = e.target.closest("[data-edit-key]");
    if (editBtn) { try { openEditModal(JSON.parse(editBtn.dataset.editKey)); } catch { } return; }

    // Delete key
    const deleteKeyBtn = e.target.closest("[data-delete-key]");
    if (deleteKeyBtn) { showConfirm("Delete Key", `Delete key "${deleteKeyBtn.dataset.deleteLabel}"?`, "Delete", "btn-danger", () => deleteKey(deleteKeyBtn.dataset.deleteKey)); return; }

    // Delete seller
    const deleteSellerBtn = e.target.closest("[data-delete-seller]");
    if (deleteSellerBtn) { showConfirm("Delete User", `Delete "${deleteSellerBtn.dataset.deleteSellerName}"?`, "Delete", "btn-danger", () => deleteSeller(deleteSellerBtn.dataset.deleteSeller)); return; }

    // Tab
    const tabEl = e.target.closest(".nav-item[data-tab]");
    if (tabEl) { switchTab(tabEl.dataset.tab); return; }
});

// App selector change
document.getElementById("appSelector").addEventListener("change", e => {
    const sel = e.target;
    const appName = sel.options[sel.selectedIndex]?.text || "";
    if (sel.value) {
        selectedAppId = sel.value;
        selectedAppName = appName;
        document.getElementById("keysContent").style.display = "block";
        document.getElementById("noAppSelected").style.display = "none";
        document.getElementById("showAllRow").style.display = currentUser?.is_admin ? "block" : "none";
        fetchKeys();
    } else {
        selectedAppId = null;
        document.getElementById("keysContent").style.display = "none";
        document.getElementById("noAppSelected").style.display = "block";
    }
});

// ─── BINDINGS ─────────────────────────────────────────────────────────────────
document.getElementById("loginBtn").addEventListener("click", login);
document.getElementById("loginPass").addEventListener("keydown", e => { if (e.key === "Enter") login(); });
document.getElementById("registerBtn").addEventListener("click", register);
document.getElementById("regPassConfirm").addEventListener("keydown", e => { if (e.key === "Enter") register(); });
document.getElementById("logoutBtn").addEventListener("click", logout);
document.getElementById("createAppBtn").addEventListener("click", openCreateAppModal);
document.getElementById("refreshAppsBtn").addEventListener("click", fetchApps);
document.getElementById("saveAppBtn").addEventListener("click", saveApp);
document.getElementById("appName").addEventListener("keydown", e => { if (e.key === "Enter") saveApp(); });
document.getElementById("generateBtn").addEventListener("click", generateKey);
document.getElementById("refreshKeysBtn").addEventListener("click", fetchKeys);
document.getElementById("addSellerBtn").addEventListener("click", addSeller);
document.getElementById("saveEditBtn").addEventListener("click", saveKeyEdit);
document.getElementById("hwidResetBtn").addEventListener("click", resetHWID);
document.getElementById("hwidBanBtn").addEventListener("click", banHWID);
document.getElementById("hwidUnbanBtn").addEventListener("click", unbanHWID);
document.getElementById("hwidDisplay").addEventListener("click", copyHwid);
