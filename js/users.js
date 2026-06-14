/**
 * EVERIUM TEST PLATFORM — USER MANAGEMENT MODULE
 */

const UserMgr = {
  users: [],
  currentRole: 'all',
  editingUserId: null,

  async init() {
    await this.loadUsers();
    this.initFilters();
    this.initForm();
  },

  async loadUsers() {
    Loading.show('Loading users…');
    try {
      const res = await API.getUsers();
      if (res.success) {
        this.users = res.data;
        this.renderTable(this.currentRole);
      }
    } catch(e) { Toast.error('Failed to load users.'); }
    finally { Loading.hide(); }
  },

  initFilters() {
    document.querySelectorAll('[data-role-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-role-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentRole = btn.dataset.roleFilter;
        this.renderTable(this.currentRole);
      });
    });

    const searchInput = document.getElementById('user-search');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(() => {
        this.renderTable(this.currentRole, searchInput.value.toLowerCase());
      }, 300));
    }
  },

  initForm() {
    const form = document.getElementById('user-form');
    if (!form) return;

    form.onsubmit = async (e) => {
      e.preventDefault();
      clearAlert('user-form-alert');

      const username = document.getElementById('uf-username').value.trim();
      const password = document.getElementById('uf-password').value;
      const name     = document.getElementById('uf-name').value.trim();
      const role     = document.getElementById('uf-role').value;
      const email    = document.getElementById('uf-email').value.trim();

      const errors = validateForm([
        { value: username, label: 'Username', required: true, minLen: 3 },
        { value: name,     label: 'Full Name', required: true },
        { value: role,     label: 'Role', required: true },
        ...(!this.editingUserId ? [{ value: password, label: 'Password', required: true, minLen: 6 }] : []),
      ]);

      if (errors.length) { showAlert('user-form-alert', errors[0], 'error'); return; }

      const btn = document.getElementById('user-form-submit');
      btn.classList.add('loading');

      try {
        let result;
        if (this.editingUserId) {
          const updates = { username, name, role, email };
          if (password) updates.password = password;
          result = await API.updateUser(this.editingUserId, updates);
        } else {
          result = await API.createUser({ username, password, name, role, email, active: true });
        }

        if (result.success) {
          Toast.success(this.editingUserId ? 'User updated successfully.' : 'User created successfully.');
          Modal.close('user-modal');
          await this.loadUsers();
        } else {
          showAlert('user-form-alert', result.message || 'Operation failed.', 'error');
        }
      } catch(e) {
        showAlert('user-form-alert', 'Connection error. Please try again.', 'error');
      } finally {
        btn.classList.remove('loading');
      }
    };
  },

  renderTable(roleFilter = 'all', search = '') {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;

    let filtered = this.users;
    if (roleFilter !== 'all') filtered = filtered.filter(u => u.role === roleFilter);
    if (search) filtered = filtered.filter(u =>
      u.name?.toLowerCase().includes(search) ||
      u.username?.toLowerCase().includes(search) ||
      u.email?.toLowerCase().includes(search)
    );

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <h3>No users found</h3><p>Try adjusting your filters or search.</p>
      </div></td></tr>`;
      return;
    }

    const roleBadge = {
      admin:   'badge-navy',
      teacher: 'badge-info',
      student: 'badge-gold',
    };

    tbody.innerHTML = filtered.map(u => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:0.75rem">
            <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--navy),var(--royal));display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:0.85rem;flex-shrink:0">
              ${(u.name || u.username)[0].toUpperCase()}
            </div>
            <div>
              <div style="font-weight:600">${u.name || '—'}</div>
              <div style="font-size:0.78rem;color:var(--text-muted)">${u.email || '—'}</div>
            </div>
          </div>
        </td>
        <td><code style="font-size:0.85rem;background:var(--off-white);padding:0.2rem 0.5rem;border-radius:4px">${u.username}</code></td>
        <td><span class="badge ${roleBadge[u.role] || 'badge-navy'}">${u.role}</span></td>
        <td>
          <span class="badge ${u.active ? 'badge-success' : 'badge-danger'}">
            ${u.active ? 'Active' : 'Disabled'}
          </span>
        </td>
        <td>
          <div style="display:flex;gap:0.4rem;flex-wrap:wrap">
            <button class="btn btn-sm btn-ghost" onclick="UserMgr.openEdit('${u.id}')">Edit</button>
            <button class="btn btn-sm btn-${u.active ? 'warning' : 'success'}" onclick="UserMgr.toggleStatus('${u.id}', ${!u.active})" style="padding:0.35rem 0.7rem;font-size:0.75rem">
              ${u.active ? 'Disable' : 'Enable'}
            </button>
            ${u.id !== Auth.userId ? `<button class="btn btn-sm btn-danger" onclick="UserMgr.deleteUser('${u.id}')">Delete</button>` : '<span style="font-size:0.75rem;color:var(--text-muted)">(You)</span>'}
          </div>
        </td>
        ${u.role === 'student' ? `<td><button class="btn btn-sm btn-ghost" onclick="UserMgr.resetAttempt('${u.id}')">Reset Attempt</button></td>` : '<td>—</td>'}
      </tr>
    `).join('');
  },

  openCreate() {
    this.editingUserId = null;
    document.getElementById('user-modal-title').textContent = 'Create New User';
    document.getElementById('user-form-submit').textContent = 'Create User';
    document.getElementById('user-form').reset();
    clearAlert('user-form-alert');
    document.getElementById('uf-password').required = true;
    document.querySelector('[for="uf-password"] .req')?.remove();
    Modal.open('user-modal');
  },

  openEdit(userId) {
    const user = this.users.find(u => u.id === userId);
    if (!user) return;

    this.editingUserId = userId;
    document.getElementById('user-modal-title').textContent = 'Edit User';
    document.getElementById('user-form-submit').textContent = 'Save Changes';
    document.getElementById('uf-username').value = user.username || '';
    document.getElementById('uf-name').value     = user.name || '';
    document.getElementById('uf-role').value     = user.role || 'student';
    document.getElementById('uf-email').value    = user.email || '';
    document.getElementById('uf-password').value = '';
    document.getElementById('uf-password').required = false;
    clearAlert('user-form-alert');
    Modal.open('user-modal');
  },

  async toggleStatus(userId, makeActive) {
    const action = makeActive ? 'enable' : 'disable';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      const result = await API.toggleUserStatus(userId, makeActive);
      if (result.success) {
        Toast.success(`User ${action}d successfully.`);
        await this.loadUsers();
      } else {
        Toast.error(result.message || `Failed to ${action} user.`);
      }
    } catch(e) { Toast.error('Connection error.'); }
  },

  async deleteUser(userId) {
    if (!confirm('Are you sure you want to permanently delete this user? This cannot be undone.')) return;

    try {
      const result = await API.deleteUser(userId);
      if (result.success) {
        Toast.success('User deleted successfully.');
        await this.loadUsers();
      } else {
        Toast.error(result.message || 'Failed to delete user.');
      }
    } catch(e) { Toast.error('Connection error.'); }
  },

  async resetAttempt(userId) {
    const user = this.users.find(u => u.id === userId);
    if (!confirm(`Reset exam attempt for ${user?.name || 'this student'}? They will be able to take the exam again.`)) return;

    try {
      // Get courses to find courseId
      const coursesRes = await API.getCourses();
      if (!coursesRes.success || !coursesRes.data.length) { Toast.error('No courses found.'); return; }

      const result = await API.resetAttempt(userId, coursesRes.data[0].id);
      if (result.success) {
        Toast.success('Attempt reset successfully. Student can now retake the exam.');
      } else {
        Toast.error(result.message || 'Reset failed.');
      }
    } catch(e) { Toast.error('Connection error.'); }
  },
};
