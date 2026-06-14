/**
 * EVERIUM TEST PLATFORM — AUTH & SESSION MANAGER
 */

const Auth = {
  _session: null,

  // ── Load session from localStorage ──
  init() {
    try {
      const raw = localStorage.getItem(CONFIG.SESSION_KEY);
      if (raw) this._session = JSON.parse(raw);
    } catch { this._session = null; }
    return this._session;
  },

  // ── Login ──
  async login(username, password) {
    const result = await API.login(username.trim(), password);
    if (result.success) {
      this._session = {
        userId: result.user.id,
        username: result.user.username,
        name: result.user.name,
        role: result.user.role,
        email: result.user.email,
        token: result.session?.token || 'local',
        loginAt: new Date().toISOString(),
      };
      localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(this._session));
    }
    return result;
  },

  // ── Logout ──
  async logout() {
    if (this._session) {
      await API.logout(this._session.userId, this._session.token).catch(() => {});
    }
    localStorage.removeItem(CONFIG.SESSION_KEY);
    localStorage.removeItem(CONFIG.ANSWERS_KEY);
    this._session = null;
  },

  // ── Getters ──
  get session()    { return this._session; },
  get isLoggedIn() { return !!this._session; },
  get role()       { return this._session?.role; },
  get userId()     { return this._session?.userId; },
  get name()       { return this._session?.name; },
  get username()   { return this._session?.username; },

  // ── Guards ──
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
