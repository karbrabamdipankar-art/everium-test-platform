/**
 * EVERIUM TEST PLATFORM — AUTH & SESSION MANAGER v2.0
 */
const Auth = {
  _session: null,

  init() {
    try {
      const raw = localStorage.getItem(CONFIG.SESSION_KEY);
      if (raw) this._session = JSON.parse(raw);
    } catch { this._session = null; }
    return this._session;
  },

  async login(username, password) {
    const result = await API.login(username.trim(), password);
    if (result.success) {
      this._session = {
        userId:   result.user.id,
        username: result.user.username,
        name:     result.user.name,
        role:     result.user.role,
        email:    result.user.email,
        courseId: result.user.courseId || '',
        token:    result.session?.token || 'local',
        loginAt:  new Date().toISOString(),
      };
      localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(this._session));
    }
    return result;
  },

  async logout() {
    if (this._session) await API.logout(this._session.userId, this._session.token).catch(() => {});
    localStorage.removeItem(CONFIG.SESSION_KEY);
    localStorage.removeItem(CONFIG.ANSWERS_KEY);
    this._session = null;
  },

  get session()    { return this._session; },
  get isLoggedIn() { return !!this._session; },
  get role()       { return this._session?.role; },
  get userId()     { return this._session?.userId; },
  get name()       { return this._session?.name; },
  get username()   { return this._session?.username; },

  requireAuth() {
    if (!this.isLoggedIn) { App.showPage('login'); return false; }
    return true;
  },

  requireRole(...roles) {
    if (!this.requireAuth()) return false;
    if (!roles.includes(this.role)) {
      Toast.error('Access denied. You do not have permission to view this page.');
      App.redirectToDashboard();
      return false;
    }
    return true;
  },
};

/**
 * EVERIUM TEST PLATFORM — UI UTILITIES v2.0
 */

// ── Toast ──────────────────────────────────────────────────────
const Toast = {
  container: null,
  init() { this.container = document.getElementById('toast-container'); },

  show(message, type = 'info', duration = 3500) {
    const icons = {
      success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
      error:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
      warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      info:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    };
    if (!this.container) this.container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `${icons[type]||icons.info}<span>${message}</span>`;
    this.container?.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success(m, d) { this.show(m, 'success', d); },
  error(m, d)   { this.show(m, 'error',   d || 4500); },
  warning(m, d) { this.show(m, 'warning', d); },
  info(m, d)    { this.show(m, 'info',    d); },
};

// ── Loading ────────────────────────────────────────────────────
const Loading = {
  overlay: null, text: null,
  init() {
    this.overlay = document.getElementById('loading-overlay');
    this.text    = document.getElementById('loading-text');
  },
  show(msg = 'Loading…') {
    if (this.text) this.text.textContent = msg;
    this.overlay?.classList.remove('hidden');
  },
  hide() { this.overlay?.classList.add('hidden'); },
};

// ── Modal ──────────────────────────────────────────────────────
const Modal = {
  open(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
  },
  close(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('open');
    document.body.style.overflow = '';
  },
  closeAll() {
    document.querySelectorAll('.modal-overlay.open').forEach(el => el.classList.remove('open'));
    document.body.style.overflow = '';
  },
};

// ── Alert helpers ──────────────────────────────────────────────
function showAlert(containerId, message, type = 'error') {
  const el = document.getElementById(containerId);
  if (!el) return;
  const icons = {
    error:   `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    success: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
    warning: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>`,
    info:    `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>`,
  };
  el.innerHTML = `<div class="alert alert-${type}">${icons[type]||''}${message}</div>`;
  el.classList.remove('hidden');
}

function clearAlert(id) {
  const el = document.getElementById(id);
  if (el) { el.innerHTML = ''; el.classList.add('hidden'); }
}

// ── DOM helpers ────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true });
  } catch { return iso; }
}

function debounce(fn, delay = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

function exportCSV(data, filename = 'export.csv') {
  if (!data.length) { Toast.warning('No data to export.'); return; }
  const keys = Object.keys(data[0]);
  const rows = [keys.join(','), ...data.map(row => keys.map(k => `"${String(row[k]??'').replace(/"/g,'""')}"`).join(','))];
  const blob = new Blob([rows.join('\n')], { type:'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Sidebar mobile toggle ──────────────────────────────────────
function initSidebar() {
  const hamburger = document.getElementById('hamburger-btn');
  const sidebar   = document.getElementById('app-sidebar');
  const overlay   = document.getElementById('sidebar-overlay');
  if (!hamburger || !sidebar) return;
  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay?.classList.toggle('open');
  });
  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  });
}
