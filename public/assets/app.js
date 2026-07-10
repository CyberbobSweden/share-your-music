// ---- auth storage (JWT in localStorage, like Polestar 4 Hub) ----
function getAuth() {
  const token = localStorage.getItem('session_token');
  let user = null;
  try { user = JSON.parse(localStorage.getItem('session_user') || 'null'); } catch (e) {}
  return { token, user };
}
function setAuth(token, user) {
  localStorage.setItem('session_token', token);
  localStorage.setItem('session_user', JSON.stringify(user));
}
function clearAuth() {
  localStorage.removeItem('session_token');
  localStorage.removeItem('session_user');
}
function redirectIfAuthed() {
  if (getAuth().token) window.location.href = '/app.html';
}
function requireAuthOrRedirect() {
  const auth = getAuth();
  if (!auth.token) { window.location.href = '/index.html'; return null; }
  return auth;
}
function logout() {
  clearAuth();
  window.location.href = '/index.html';
}

// ---- API calls ----
async function apiFetch(path, options = {}) {
  const { token } = getAuth();
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(path, { ...options, headers });
    let data = null;
    try { data = await res.json(); } catch (e) {}
    if (res.status === 401) { clearAuth(); window.location.href = '/index.html'; return null; }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { error: 'Network error — check your connection.' } };
  }
}

// ---- small UI helpers ----
function showAlert(id, msg, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'alert ' + type;
  el.style.display = 'block';
}
function hideAlert(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}
function setLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  if (loading) { btn.dataset.origText = btn.dataset.origText || btn.textContent; btn.textContent = 'Vänta...'; }
  else if (btn.dataset.origText) btn.textContent = btn.dataset.origText;
}
function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}
function flagEmoji(cc) {
  if (!cc) return '';
  return cc.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

// ---- trust / reputation (mirrors the logic enforced server-side) ----
function computeTrust(p) {
  const pos = p.ratings_pos || 0, neg = p.ratings_neg || 0, total = pos + neg;
  const ratio = (pos + 1) / (total + 2);
  let level = 'ny', label = 'New Reviewer';
  if (total >= 5 && ratio < 0.4) { level = 'omtvistad'; label = 'Disputed'; }
  else if (total >= 30 && ratio >= 0.9) { level = 'expert'; label = 'Expert'; }
  else if (total >= 15 && ratio >= 0.75) { level = 'betrodd'; label = 'Trusted'; }
  else if (total >= 5 && ratio >= 0.6) { level = 'palitlig'; label = 'Reliable'; }
  return { level, label, ratio, total };
}
function badgeHtml(p) {
  const t = computeTrust(p);
  return `<span class="badge ${t.level}"><i></i>${t.label}</span>`;
}

// Bump this on every meaningful change and mention the new number in chat —
// it's the easiest way to visually confirm a deploy actually went live.
const APP_VERSION = 'v1.3.0 · 2026-07-10';

function renderVersionFooter(){
  const el = document.getElementById('versionFooter');
  if(el) el.textContent = APP_VERSION;
}
document.addEventListener('DOMContentLoaded', renderVersionFooter);
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
