/**
 * EVERIUM TEST PLATFORM — API LAYER
 * ===================================
 * Handles all communication with Google Apps Script backend.
 * Falls back to DEMO_MODE when API_URL is not configured.
 */

const API = {

  // ── Generic request to Google Apps Script ──
  // IMPORTANT: Google Apps Script Web Apps do not return proper CORS
  // headers for POST requests with a JSON Content-Type, which causes
  // the browser's CORS preflight (OPTIONS) check to fail.
  // To avoid this entirely, ALL requests (including writes) are sent
  // as simple GET requests with URL parameters. Simple GET requests
  // do not trigger a CORS preflight, so this works reliably.
  async request(action, data = {}) {
    if (CONFIG.DEMO_MODE || CONFIG.API_URL.includes('YOUR_SCRIPT_ID_HERE')) {
      return this._demoHandler(action, data);
    }
    try {
      const payload = { action, ...data };
      const url = new URL(CONFIG.API_URL);
      Object.keys(payload).forEach(k => {
        if (payload[k] !== undefined) {
          url.searchParams.append(k, JSON.stringify(payload[k]));
        }
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow',
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      return result;
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    }
  },

  // ── "post" is kept for semantic clarity in calling code, but is
  //    implemented identically to request() to avoid CORS issues
  //    with Google Apps Script. ──
  async post(action, data = {}) {
    return this.request(action, data);
  },

  // ─────────────────────────────────────────────
  //  AUTH
  // ─────────────────────────────────────────────
  async login(username, password) {
    return this.request('login', { username, password });
  },

  async logout(userId, sessionToken) {
    return this.request('logout', { userId, sessionToken });
  },

  // ─────────────────────────────────────────────
  //  USERS
  // ─────────────────────────────────────────────
  async getUsers(role = null) {
    return this.request('getUsers', { role });
  },

  async createUser(userData) {
    return this.post('createUser', { userData });
  },

  async updateUser(userId, updates) {
    return this.post('updateUser', { userId, updates });
  },

  async deleteUser(userId) {
    return this.post('deleteUser', { userId });
  },

  async toggleUserStatus(userId, active) {
    return this.post('toggleUserStatus', { userId, active });
  },

  // ─────────────────────────────────────────────
  //  COURSES
  // ─────────────────────────────────────────────
  async getCourses() {
    return this.request('getCourses');
  },

  // ─────────────────────────────────────────────
  //  QUESTIONS
  // ─────────────────────────────────────────────
  async getQuestions(courseId) {
    return this.request('getQuestions', { courseId });
  },

  async createQuestion(questionData) {
    return this.post('createQuestion', { questionData });
  },

  async updateQuestion(questionId, updates) {
    return this.post('updateQuestion', { questionId, updates });
  },

  async deleteQuestion(questionId) {
    return this.post('deleteQuestion', { questionId });
  },

  // ─────────────────────────────────────────────
  //  ATTEMPTS
  // ─────────────────────────────────────────────
  async getAttempt(userId, courseId) {
    return this.request('getAttempt', { userId, courseId });
  },

  async startAttempt(userId, courseId) {
    return this.post('startAttempt', { userId, courseId });
  },

  async saveAnswer(attemptId, questionId, answer) {
    return this.post('saveAnswer', { attemptId, questionId, answer });
  },

  async submitAttempt(attemptId, answers) {
    return this.post('submitAttempt', { attemptId, answers });
  },

  async resetAttempt(userId, courseId) {
    return this.post('resetAttempt', { userId, courseId });
  },

  async syncTimer(attemptId, remainingSeconds) {
    return this.post('syncTimer', { attemptId, remainingSeconds });
  },

  // ─────────────────────────────────────────────
  //  RESULTS / ANALYTICS
  // ─────────────────────────────────────────────
  async getResults(courseId = null) {
    return this.request('getResults', { courseId });
  },

  async getStudentResults(userId) {
    return this.request('getStudentResults', { userId });
  },

  async getAnalytics() {
    return this.request('getAnalytics');
  },

  // ─────────────────────────────────────────────
  //  DEMO HANDLER — simulates API using in-memory data
  // ─────────────────────────────────────────────
  _demoHandler(action, data) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this._processDemo(action, data));
      }, 180); // simulate network latency
    });
  },

  _processDemo(action, data) {
    const store = DemoStore;

    switch (action) {

      case 'login': {
        const user = store.users.find(u =>
          u.username === data.username &&
          u.password === data.password &&
          u.active
        );
        if (!user) return { success: false, message: 'Invalid username or password.' };
        const session = { userId: user.id, token: 'demo_' + Date.now(), role: user.role };
        return { success: true, user: { ...user, password: undefined }, session };
      }

      case 'logout':
        return { success: true };

      case 'getUsers': {
        let users = [...store.users];
        if (data.role) users = users.filter(u => u.role === data.role);
        return { success: true, data: users.map(u => ({ ...u, password: undefined })) };
      }

      case 'createUser': {
        const u = data.userData;
        if (store.users.find(x => x.username === u.username)) {
          return { success: false, message: 'Username already exists.' };
        }
        const newUser = { ...u, id: 'u' + Date.now(), active: true };
        store.users.push(newUser);
        return { success: true, data: { ...newUser, password: undefined } };
      }

      case 'updateUser': {
        const idx = store.users.findIndex(u => u.id === data.userId);
        if (idx < 0) return { success: false, message: 'User not found.' };
        // Guard: prevent disabling last admin
        if (data.updates.active === false || data.updates.role !== 'admin') {
          const activeAdmins = store.users.filter(u => u.role === 'admin' && u.active && u.id !== data.userId);
          if (store.users[idx].role === 'admin' && activeAdmins.length === 0) {
            return { success: false, message: 'Operation not permitted. The system must always have at least one active Admin account.' };
          }
        }
        store.users[idx] = { ...store.users[idx], ...data.updates };
        return { success: true, data: { ...store.users[idx], password: undefined } };
      }

      case 'deleteUser': {
        const idx = store.users.findIndex(u => u.id === data.userId);
        if (idx < 0) return { success: false, message: 'User not found.' };
        const user = store.users[idx];
        if (user.role === 'admin') {
          const otherAdmins = store.users.filter(u => u.role === 'admin' && u.active && u.id !== data.userId);
          if (otherAdmins.length === 0) {
            return { success: false, message: 'Operation not permitted. The system must always have at least one active Admin account.' };
          }
        }
        store.users.splice(idx, 1);
        return { success: true };
      }

      case 'toggleUserStatus': {
        const user = store.users.find(u => u.id === data.userId);
        if (!user) return { success: false, message: 'User not found.' };
        if (!data.active && user.role === 'admin') {
          const otherActive = store.users.filter(u => u.role === 'admin' && u.active && u.id !== data.userId);
          if (otherActive.length === 0) {
            return { success: false, message: 'Operation not permitted. The system must always have at least one active Admin account.' };
          }
        }
        user.active = data.active;
        return { success: true };
      }

      case 'getCourses':
        return { success: true, data: store.courses };

      case 'getQuestions': {
        const qs = data.courseId
          ? store.questions.filter(q => q.courseId === data.courseId)
          : store.questions;
        return { success: true, data: qs.sort((a,b) => a.order - b.order) };
      }

      case 'createQuestion': {
        const q = { ...data.questionData, id: 'q' + Date.now() };
        store.questions.push(q);
        return { success: true, data: q };
      }

      case 'updateQuestion': {
        const idx = store.questions.findIndex(q => q.id === data.questionId);
        if (idx < 0) return { success: false, message: 'Question not found.' };
        store.questions[idx] = { ...store.questions[idx], ...data.updates };
        return { success: true, data: store.questions[idx] };
      }

      case 'deleteQuestion': {
        const idx = store.questions.findIndex(q => q.id === data.questionId);
        if (idx >= 0) store.questions.splice(idx, 1);
        return { success: true };
      }

      case 'getAttempt': {
        const attempt = store.attempts.find(a => a.userId === data.userId && a.courseId === data.courseId);
        if (!attempt) return { success: true, data: null };
        const answers = store.answers.filter(a => a.attemptId === attempt.id);
        return { success: true, data: { ...attempt, answers } };
      }

      case 'startAttempt': {
        const existing = store.attempts.find(a => a.userId === data.userId && a.courseId === data.courseId);
        if (existing) return { success: false, message: 'An attempt already exists for this user and course.' };
        const attempt = {
          id: 'att' + Date.now(),
          userId: data.userId,
          courseId: data.courseId,
          status: 'active',
          startTime: new Date().toISOString(),
          endTime: null,
          remainingSeconds: CONFIG.EXAM_DURATION_MINUTES * 60,
          score: null,
          mcqScore: null,
          tfScore: null,
        };
        store.attempts.push(attempt);
        return { success: true, data: attempt };
      }

      case 'saveAnswer': {
        const existing = store.answers.find(a => a.attemptId === data.attemptId && a.questionId === data.questionId);
        if (existing) {
          existing.answer = data.answer;
          existing.savedAt = new Date().toISOString();
        } else {
          store.answers.push({
            id: 'ans' + Date.now(),
            attemptId: data.attemptId,
            questionId: data.questionId,
            answer: data.answer,
            savedAt: new Date().toISOString()
          });
        }
        return { success: true };
      }

      case 'submitAttempt': {
        const attempt = store.attempts.find(a => a.id === data.attemptId);
        if (!attempt) return { success: false, message: 'Attempt not found.' };
        if (attempt.status === 'completed') return { success: false, message: 'Attempt already submitted.' };

        // Score MCQ and TF
        const questions = store.questions.filter(q => q.courseId === attempt.courseId);
        let mcqScore = 0, tfScore = 0;

        for (const [qId, ans] of Object.entries(data.answers || {})) {
          const question = questions.find(q => q.id === qId);
          if (!question) continue;
          if (question.type === 'mcq' && ans === question.correct) mcqScore++;
          if (question.type === 'tf' && ans === question.correct) tfScore++;
          // Save answer
          const existing = store.answers.find(a => a.attemptId === data.attemptId && a.questionId === qId);
          if (existing) { existing.answer = ans; }
          else { store.answers.push({ id: 'ans' + Date.now() + Math.random(), attemptId: data.attemptId, questionId: qId, answer: ans, savedAt: new Date().toISOString() }); }
        }

        attempt.status = 'completed';
        attempt.endTime = new Date().toISOString();
        attempt.mcqScore = mcqScore;
        attempt.tfScore = tfScore;
        attempt.score = mcqScore + tfScore;

        return { success: true, data: { score: attempt.score, mcqScore, tfScore } };
      }

      case 'resetAttempt': {
        const aIdx = store.attempts.findIndex(a => a.userId === data.userId && a.courseId === data.courseId);
        if (aIdx >= 0) {
          const attId = store.attempts[aIdx].id;
          store.attempts.splice(aIdx, 1);
          store.answers = store.answers.filter(a => a.attemptId !== attId);
        }
        return { success: true };
      }

      case 'syncTimer': {
        const attempt = store.attempts.find(a => a.id === data.attemptId);
        if (attempt) attempt.remainingSeconds = data.remainingSeconds;
        return { success: true };
      }

      case 'getResults': {
        const results = store.attempts
          .filter(a => a.status === 'completed')
          .map(a => {
            const user = store.users.find(u => u.id === a.userId);
            const course = store.courses.find(c => c.id === a.courseId);
            const answers = store.answers.filter(ans => ans.attemptId === a.id);
            return {
              attemptId: a.id,
              userId: a.userId,
              studentName: user ? user.name : 'Unknown',
              username: user ? user.username : 'Unknown',
              courseId: a.courseId,
              courseName: course ? course.name : 'Unknown',
              startTime: a.startTime,
              endTime: a.endTime,
              score: a.score,
              mcqScore: a.mcqScore,
              tfScore: a.tfScore,
              answers,
            };
          });
        if (data.courseId) return { success: true, data: results.filter(r => r.courseId === data.courseId) };
        return { success: true, data: results };
      }

      case 'getAnalytics': {
        const completed = store.attempts.filter(a => a.status === 'completed');
        const active    = store.attempts.filter(a => a.status === 'active');
        const total     = store.users.filter(u => u.role === 'student').length;
        const avgScore  = completed.length ? Math.round(completed.reduce((s, a) => s + (a.score || 0), 0) / completed.length) : 0;
        return {
          success: true,
          data: {
            totalStudents: total,
            completedAttempts: completed.length,
            activeAttempts: active.length,
            notStarted: total - completed.length - active.length,
            averageScore: avgScore,
            maxScore: CONFIG.MCQ_COUNT + CONFIG.TF_COUNT,
          }
        };
      }

      default:
        return { success: false, message: `Unknown action: ${action}` };
    }
  }
};

// ── In-memory store for demo mode ──
const DemoStore = {
  users:    [...DEMO_USERS],
  courses:  [...DEMO_COURSES],
  questions:[...DEMO_QUESTIONS],
  attempts: [],
  answers:  [],
};
