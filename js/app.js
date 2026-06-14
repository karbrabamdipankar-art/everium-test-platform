/**
 * EVERIUM TEST PLATFORM — MAIN APP CONTROLLER
 */

const App = {
  currentPage: null,

  // ── Initialise ──
  async init() {
    Toast.init();
    Loading.init();
    Auth.init();

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) Modal.close(overlay.id);
      });
    });

    // Close modal buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => Modal.close(btn.dataset.closeModal));
    });

    Loading.hide();

    if (Auth.isLoggedIn) {
      this.redirectToDashboard();
    } else {
      this.showPage('login');
    }
  },

  // ── Page Navigation ──
  showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById(`${pageId}-page`);
    if (!page) return;
    page.style.display = '';
    page.classList.add('active', 'entering');
    setTimeout(() => page.classList.remove('entering'), 400);
    this.currentPage = pageId;
    window.scrollTo(0, 0);
  },

  // ── Dashboard redirect by role ──
  redirectToDashboard() {
    const role = Auth.role;
    if (role === 'admin')   { this.showPage('admin-dashboard');   AdminDash.init(); }
    else if (role === 'teacher') { this.showPage('teacher-dashboard'); TeacherDash.init(); }
    else if (role === 'student') { this.showPage('student-dashboard'); StudentDash.init(); }
    else this.showPage('login');
  },

  // ── Logout handler ──
  async logout() {
    if (!confirm('Are you sure you want to log out?')) return;
    Loading.show('Signing out…');
    await Auth.logout();
    ExamTimer.stop();
    Loading.hide();
    Toast.info('You have been signed out.');
    this.showPage('login');
    LoginPage.init();
  },
};

// ── LOGIN PAGE ──
const LoginPage = {
  init() {
    const form = document.getElementById('login-form');
    if (!form) return;
    form.onsubmit = async (e) => {
      e.preventDefault();
      clearAlert('login-alert');

      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;

      if (!username || !password) {
        showAlert('login-alert', 'Please enter both username and password.', 'error');
        return;
      }

      const btn = document.getElementById('login-btn');
      btn.classList.add('loading');

      try {
        const result = await Auth.login(username, password);
        if (result.success) {
          Toast.success(`Welcome back, ${result.user.name}!`);
          App.redirectToDashboard();
        } else {
          showAlert('login-alert', result.message || 'Login failed. Please check your credentials.', 'error');
        }
      } catch (err) {
        showAlert('login-alert', 'Connection error. Please check your internet and try again.', 'error');
      } finally {
        btn.classList.remove('loading');
      }
    };

    // Password toggle
    const toggle = document.getElementById('password-toggle');
    const pwInput = document.getElementById('login-password');
    if (toggle && pwInput) {
      toggle.addEventListener('click', () => {
        const isText = pwInput.type === 'text';
        pwInput.type = isText ? 'password' : 'text';
        toggle.innerHTML = isText
          ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
          : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
      });
    }
  },
};

// ── STUDENT DASHBOARD ──
const StudentDash = {
  async init() {
    if (!Auth.requireRole('student')) return;

    // Set user info in sidebar
    document.querySelectorAll('.sidebar-user-name').forEach(el => el.textContent = Auth.name);
    document.querySelectorAll('.sidebar-user-role').forEach(el => el.textContent = 'Student');
    document.querySelectorAll('.sidebar-user-avatar').forEach(el => el.textContent = Auth.name[0].toUpperCase());

    document.getElementById('student-greeting').textContent = `Welcome, ${Auth.name}`;
    initSidebar();

    // Check for existing active attempt
    try {
      const courses = await API.getCourses();
      if (courses.success && courses.data.length > 0) {
        const course = courses.data[0];
        const attemptRes = await API.getAttempt(Auth.userId, course.id);
        if (attemptRes.success && attemptRes.data) {
          const attempt = attemptRes.data;
          if (attempt.status === 'active') {
            document.getElementById('student-resume-btn').classList.remove('hidden');
            document.getElementById('student-resume-btn').onclick = () => {
              ExamPage.resume(course, attempt);
            };
          } else if (attempt.status === 'completed') {
            document.getElementById('student-completed-notice').classList.remove('hidden');
            document.getElementById('student-start-area').classList.add('hidden');
          }
        }
      }
    } catch(e) { console.warn('Could not load attempt status.'); }
  },
};

// ── TEACHER DASHBOARD ──
const TeacherDash = {
  async init() {
    if (!Auth.requireRole('teacher', 'admin')) return;
    document.querySelectorAll('.sidebar-user-name').forEach(el => el.textContent = Auth.name);
    document.querySelectorAll('.sidebar-user-role').forEach(el => el.textContent = Auth.role === 'admin' ? 'Administrator' : 'Teacher');
    document.querySelectorAll('.sidebar-user-avatar').forEach(el => el.textContent = Auth.name[0].toUpperCase());
    initSidebar();
    await this.loadResults();
  },

  async loadResults() {
    Loading.show('Loading results…');
    try {
      const [resultsRes, analyticsRes] = await Promise.all([
        API.getResults(),
        API.getAnalytics()
      ]);

      if (analyticsRes.success) {
        const a = analyticsRes.data;
        const avgLabel = a.averageScore + '/' + a.maxScore;

        // Update teacher dashboard stats
        this._setText('t-stat-completed', a.completedAttempts);
        this._setText('t-stat-active', a.activeAttempts);
        this._setText('t-stat-students', a.totalStudents);
        this._setText('t-stat-avg', avgLabel);

        // Update admin results stats (if present)
        this._setText('ar-stat-completed', a.completedAttempts);
        this._setText('ar-stat-active', a.activeAttempts);
        this._setText('ar-stat-students', a.totalStudents);
        this._setText('ar-stat-avg', avgLabel);
      }

      if (resultsRes.success) {
        this.renderResultsTable(resultsRes.data);
      }
    } catch(e) {
      Toast.error('Failed to load results.');
    } finally { Loading.hide(); }
  },

  _setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  },

  renderResultsTable(results) {
    const rowsHTML = (() => {
      if (!results.length) {
        return `<tr><td colspan="7"><div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2z"/></svg><h3>No submissions yet</h3><p>Student results will appear here after they complete the test.</p></div></td></tr>`;
      }
      return results.map(r => `
        <tr>
          <td><strong>${r.studentName}</strong><br><small style="color:var(--text-muted)">${r.username}</small></td>
          <td>${r.courseName}</td>
          <td>${r.mcqScore ?? '—'}/15</td>
          <td>${r.tfScore ?? '—'}/10</td>
          <td><strong>${r.score ?? '—'}/25</strong></td>
          <td>${formatDate(r.endTime)}</td>
          <td><button class="btn btn-sm btn-ghost" onclick="TeacherDash.viewDetail('${r.attemptId}')">View Answers</button></td>
        </tr>
      `).join('');
    })();

    const teacherTbody = document.getElementById('results-tbody');
    const adminTbody = document.getElementById('ar-results-tbody');
    if (teacherTbody) teacherTbody.innerHTML = rowsHTML;
    if (adminTbody) adminTbody.innerHTML = rowsHTML;
  },

  _currentResults: [],

  async viewDetail(attemptId) {
    // Show descriptive answers modal
    const results = await API.getResults();
    if (!results.success) return;
    const result = results.data.find(r => r.attemptId === attemptId);
    if (!result) return;

    const questions = await API.getQuestions(result.courseId);
    if (!questions.success) return;

    const descQs = questions.data.filter(q => q.type === 'descriptive');
    const modal = document.getElementById('detail-modal');
    document.getElementById('detail-student-name').textContent = result.studentName;

    const descBody = document.getElementById('descriptive-answers-body');
    if (descQs.length === 0) {
      descBody.innerHTML = '<p style="color:var(--text-muted)">No descriptive questions in this exam.</p>';
    } else {
      descBody.innerHTML = descQs.map(q => {
        const ans = result.answers?.find(a => a.questionId === q.id);
        return `
          <div style="margin-bottom:1.5rem;padding:1rem;background:var(--off-white);border-radius:var(--radius-md);border:1px solid var(--border)">
            <p style="font-weight:600;margin-bottom:0.5rem;color:var(--navy)">Q${q.order}. ${q.text}</p>
            <p style="color:var(--text-secondary);font-size:0.9rem;white-space:pre-wrap">${ans?.answer || '<em style="color:var(--text-muted)">No response provided.</em>'}</p>
          </div>`;
      }).join('');
    }

    Modal.open('detail-modal');
  },
};

// ── ADMIN DASHBOARD ──
const AdminDash = {
  currentView: 'overview',

  async init() {
    if (!Auth.requireRole('admin')) return;
    document.querySelectorAll('.sidebar-user-name').forEach(el => el.textContent = Auth.name);
    document.querySelectorAll('.sidebar-user-role').forEach(el => el.textContent = 'Administrator');
    document.querySelectorAll('.sidebar-user-avatar').forEach(el => el.textContent = Auth.name[0].toUpperCase());
    initSidebar();
    this.initNavigation();
    await this.loadOverview();
  },

  initNavigation() {
    document.querySelectorAll('[data-admin-view]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.dataset.adminView;
        this.switchView(view);
      });
    });
  },

  async switchView(view) {
    this.currentView = view;

    // Update active nav items
    document.querySelectorAll('[data-admin-view]').forEach(l => l.classList.remove('active'));
    document.querySelectorAll(`[data-admin-view="${view}"]`).forEach(l => l.classList.add('active'));

    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));

    // Show target section
    const section = document.getElementById(`admin-${view}`);
    if (section) section.classList.remove('hidden');

    // Update topbar title
    const titles = {
      overview: 'Dashboard Overview',
      users: 'User Management',
      questions: 'Question Management',
      results: 'Results & Reports',
      analytics: 'Analytics',
    };
    document.getElementById('admin-topbar-title').textContent = titles[view] || 'Dashboard';

    // Load data for the view
    switch(view) {
      case 'overview':  await this.loadOverview(); break;
      case 'users':     await UserMgr.init(); break;
      case 'questions': await QuestionMgr.init(); break;
      case 'results':   await TeacherDash.loadResults(); break;
      case 'analytics': await this.loadAnalytics(); break;
    }
  },

  async loadOverview() {
    try {
      const [analyticsRes, usersRes] = await Promise.all([
        API.getAnalytics(),
        API.getUsers(),
      ]);

      if (analyticsRes.success) {
        const a = analyticsRes.data;
        document.getElementById('a-stat-students')?.setAttribute('data-val', a.totalStudents);
        document.getElementById('a-stat-completed')?.setAttribute('data-val', a.completedAttempts);
        document.getElementById('a-stat-active')?.setAttribute('data-val', a.activeAttempts);
        document.getElementById('a-stat-avg')?.setAttribute('data-val', a.averageScore);

        // Animate counters
        document.querySelectorAll('[data-val]').forEach(el => {
          const target = parseInt(el.getAttribute('data-val')) || 0;
          animateCounter(el, target);
        });
      }

      if (usersRes.success) {
        const teachers = usersRes.data.filter(u => u.role === 'teacher').length;
        const admins   = usersRes.data.filter(u => u.role === 'admin').length;
        document.getElementById('a-stat-teachers')?.setAttribute('data-val', teachers);
        document.getElementById('a-stat-admins')?.setAttribute('data-val', admins);
        document.querySelectorAll('[data-val]').forEach(el => {
          const target = parseInt(el.getAttribute('data-val')) || 0;
          animateCounter(el, target);
        });
      }
    } catch(e) { console.warn('Analytics load error', e); }
  },

  async loadAnalytics() {
    try {
      const res = await API.getAnalytics();
      if (res.success) {
        const a = res.data;
        const total = a.totalStudents;
        const notStarted = Math.max(0, total - a.completedAttempts - a.activeAttempts);

        const bars = [
          { label: 'Completed', value: a.completedAttempts, max: total, color: 'var(--emerald)' },
          { label: 'In Progress', value: a.activeAttempts, max: total, color: 'var(--gold)' },
          { label: 'Not Started', value: notStarted, max: total, color: 'var(--silver)' },
        ];

        const container = document.getElementById('analytics-bars');
        if (container) {
          container.innerHTML = bars.map(b => {
            const pct = total > 0 ? Math.round((b.value / total) * 100) : 0;
            return `
              <div style="margin-bottom:1.25rem">
                <div style="display:flex;justify-content:space-between;margin-bottom:0.4rem">
                  <span style="font-size:0.875rem;font-weight:600;color:var(--text-primary)">${b.label}</span>
                  <span style="font-size:0.875rem;color:var(--text-muted)">${b.value} (${pct}%)</span>
                </div>
                <div class="progress-bar-track" style="height:10px">
                  <div class="progress-bar-fill" style="width:0%;background:${b.color}" data-target="${pct}"></div>
                </div>
              </div>`;
          }).join('');

          // Animate progress bars
          setTimeout(() => {
            container.querySelectorAll('.progress-bar-fill[data-target]').forEach(bar => {
              bar.style.width = bar.dataset.target + '%';
            });
          }, 100);
        }
      }
    } catch(e) { console.warn('Analytics error'); }
  }
};

function animateCounter(el, target, duration = 800) {
  const start = performance.now();
  const initial = parseInt(el.textContent) || 0;
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(initial + (target - initial) * ease);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── COURSE SELECTION PAGE ──
const CourseSelection = {
  courses: [],
  selectedCourse: null,

  async init() {
    if (!Auth.requireRole('student')) return;
    Loading.show('Loading courses…');

    try {
      const [coursesRes, attemptCheck] = await Promise.all([
        API.getCourses(),
        this.checkExistingAttempts(),
      ]);

      if (coursesRes.success) {
        this.courses = coursesRes.data;
        this.renderCourses(attemptCheck);
      }
    } catch(e) {
      Toast.error('Failed to load courses.');
    } finally { Loading.hide(); }
  },

  async checkExistingAttempts() {
    const attempts = {};
    // Check for each course if needed — simplified here
    return attempts;
  },

  renderCourses(attemptCheck) {
    const container = document.getElementById('courses-container');
    if (!container) return;

    if (!this.courses.length) {
      container.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg><h3>No Courses Available</h3><p>Please contact your administrator.</p></div>`;
      return;
    }

    container.innerHTML = this.courses.map(course => `
      <div class="course-card" data-course-id="${course.id}" onclick="CourseSelection.selectCourse('${course.id}')">
        <div class="course-icon">
          <svg viewBox="0 0 24 24"><path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/></svg>
        </div>
        <div class="course-info">
          <h3>${course.name}</h3>
          <p>${course.description}</p>
          <div class="course-meta">
            <span>⏱ ${course.duration} Minutes</span>
            <span>📋 ${course.totalQuestions} Questions</span>
            <span>📝 MCQ + T/F + Descriptive</span>
          </div>
        </div>
        <div style="margin-left:auto;flex-shrink:0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--silver)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>
    `).join('');
  },

  selectCourse(courseId) {
    this.selectedCourse = this.courses.find(c => c.id === courseId);
    document.querySelectorAll('.course-card').forEach(c => c.classList.remove('selected'));
    document.querySelector(`[data-course-id="${courseId}"]`)?.classList.add('selected');
    document.getElementById('start-test-btn').disabled = false;
    document.getElementById('start-test-btn').classList.remove('hidden');
  },

  async startTest() {
    if (!this.selectedCourse) { Toast.warning('Please select a course first.'); return; }

    Loading.show('Preparing your exam…');
    try {
      // Check for existing attempt
      const existingRes = await API.getAttempt(Auth.userId, this.selectedCourse.id);
      if (existingRes.success && existingRes.data) {
        const attempt = existingRes.data;
        if (attempt.status === 'completed') {
          Toast.error('You have already completed this assessment.');
          Loading.hide();
          return;
        }
        if (attempt.status === 'active') {
          Loading.hide();
          ExamPage.resume(this.selectedCourse, attempt);
          return;
        }
      }

      // Start new attempt
      const startRes = await API.startAttempt(Auth.userId, this.selectedCourse.id);
      if (!startRes.success) {
        Toast.error(startRes.message || 'Failed to start test.');
        Loading.hide();
        return;
      }

      // Load questions
      const qRes = await API.getQuestions(this.selectedCourse.id);
      if (!qRes.success || !qRes.data.length) {
        Toast.error('No questions found for this course.');
        Loading.hide();
        return;
      }

      Loading.hide();
      ExamPage.start(this.selectedCourse, startRes.data, qRes.data);
    } catch(e) {
      Toast.error('An error occurred. Please try again.');
      Loading.hide();
    }
  },
};
