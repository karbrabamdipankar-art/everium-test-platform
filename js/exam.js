/**
 * EVERIUM TEST PLATFORM — EXAM ENGINE v2.0
 * • Timer duration pulled from TestConfig (per-course, set by admin)
 * • Server-side start time = tamper-proof timer
 * • Auto-submit on expiry
 * • Progress preserved across devices and refreshes
 */

// ── Timer ─────────────────────────────────────────────────────
const ExamTimer = {
  remaining:      0,
  interval:       null,
  syncInterval:   null,
  attemptId:      null,
  warningShown:   false,
  dangerShown:    false,
  _displayEl:     null,

  start(remainingSeconds, attemptId) {
    this.stop();
    this.remaining    = Math.max(0, remainingSeconds);
    this.attemptId    = attemptId;
    this.warningShown = false;
    this.dangerShown  = false;
    this._displayEl   = document.getElementById('timer-display');
    this._render();

    this.interval = setInterval(() => {
      if (this.remaining > 0) {
        this.remaining--;
        this._render();
      }
      if (this.remaining <= 0) {
        this.expire();
      }
    }, 1000);

    // Sync remaining time to server every 30 s (so cross-device resume is accurate)
    this.syncInterval = setInterval(() => {
      if (this.attemptId && this.remaining > 0) {
        API.syncTimer(this.attemptId, this.remaining).catch(() => {});
      }
    }, 30000);
  },

  stop() {
    clearInterval(this.interval);
    clearInterval(this.syncInterval);
    this.interval     = null;
    this.syncInterval = null;
  },

  expire() {
    this.stop();
    Toast.warning('⏰ Time is up! Your exam is being submitted automatically.', 5000);
    ExamPage.submit(true);
  },

  _render() {
    if (!this._displayEl) this._displayEl = document.getElementById('timer-display');
    if (!this._displayEl) return;

    const m = Math.floor(this.remaining / 60);
    const s = this.remaining % 60;
    this._displayEl.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

    if (this.remaining <= 60) {
      this._displayEl.className = 'timer-display danger';
      if (!this.dangerShown) {
        Toast.error('Less than 1 minute remaining! Please submit now.', 5000);
        this.dangerShown = true;
      }
    } else if (this.remaining <= 300) {
      this._displayEl.className = 'timer-display warning';
      if (!this.warningShown) {
        Toast.warning('5 minutes remaining! Please wrap up your answers.', 4000);
        this.warningShown = true;
      }
    } else {
      this._displayEl.className = 'timer-display';
    }
  },
};

// ── Exam Page ─────────────────────────────────────────────────
const ExamPage = {
  course:        null,
  attempt:       null,
  questions:     [],
  answers:       {},
  currentIndex:  0,
  _descTimers:   {},

  // ── Start fresh ──
  async start(course, attempt, questions) {
    this.course       = course;
    this.attempt      = attempt;
    this.questions    = questions;
    this.answers      = {};
    this.currentIndex = 0;

    App.showPage('test');
    this._setupUI();

    // Use remainingSeconds from attempt (calculated server-side from startTime)
    const remaining = attempt.remainingSeconds ?? (course.duration || CONFIG.EXAM_DURATION_MINUTES) * 60;
    ExamTimer.start(remaining, attempt.id);
    this._renderQuestion();
  },

  // ── Resume in-progress ──
  async resume(course, attempt) {
    Loading.show('Restoring your progress…');
    try {
      const qRes = await API.getQuestions(course.id);
      if (!qRes.success) { Toast.error('Failed to load questions.'); Loading.hide(); return; }

      this.course       = course;
      this.attempt      = attempt;
      this.questions    = qRes.data;
      this.currentIndex = 0;
      this.answers      = {};

      // Restore saved answers
      if (attempt.answers) {
        attempt.answers.forEach(a => { this.answers[a.questionId] = a.answer; });
      }

      // Remaining time is computed server-side based on startTime; trust that value
      const remaining = attempt.remainingSeconds ?? 0;
      if (remaining <= 0) {
        Toast.error('Your time has expired. Submitting automatically…');
        await this.submit(true);
        Loading.hide();
        return;
      }

      Loading.hide();
      App.showPage('test');
      this._setupUI();
      ExamTimer.start(remaining, attempt.id);
      this._renderQuestion();
      Toast.info('Your previous progress has been restored.', 3000);
    } catch(e) {
      Toast.error('Failed to restore your session. Please try again.');
      Loading.hide();
    }
  },

  _setupUI() {
    const courseNameEl = document.getElementById('test-course-name');
    if (courseNameEl) courseNameEl.textContent = this.course.name;

    const studentNameEl = document.getElementById('test-student-name');
    if (studentNameEl) studentNameEl.textContent = Auth.name;

    this._renderNavGrid();
  },

  _renderNavGrid() {
    const grid = document.getElementById('question-nav-grid');
    if (!grid) return;
    grid.innerHTML = this.questions.map((q, i) => `
      <button
        class="q-nav-btn ${this.answers[q.id] !== undefined && this.answers[q.id] !== '' ? 'answered' : ''} ${i === this.currentIndex ? 'current' : ''}"
        onclick="ExamPage.goTo(${i})"
        title="Question ${i + 1}"
      >${i + 1}</button>`).join('');
  },

  _renderQuestion() {
    const q = this.questions[this.currentIndex];
    if (!q) return;

    const container = document.getElementById('question-container');
    if (!container) return;

    const typeLabels = { mcq:'Multiple Choice', tf:'True / False', descriptive:'Descriptive (Written)' };

    let html = `
      <div class="question-meta">
        <span class="question-number">Question ${this.currentIndex + 1} of ${this.questions.length}</span>
        <span class="question-type-badge">${typeLabels[q.type] || q.type}</span>
        ${q.marks ? `<span class="question-type-badge" style="color:var(--gold);border-color:rgba(212,175,55,.3)">${q.marks} mark${q.marks > 1 ? 's' : ''}</span>` : ''}
      </div>
      <p class="question-text">${this._escapeHtml(q.text)}</p>`;

    if (q.type === 'mcq') {
      const selected = this.answers[q.id];
      const options  = ['A','B','C','D'].map(k => ({ key:k, text:q['option'+k] || '' }));
      html += `<div class="options-list">
        ${options.map(o => `
          <div class="option-item ${selected === o.key ? 'selected' : ''}"
               onclick="ExamPage.selectOption('${q.id}','${o.key}',this)">
            <div class="option-marker">${o.key}</div>
            <div class="option-text">${this._escapeHtml(o.text)}</div>
          </div>`).join('')}
      </div>`;
    } else if (q.type === 'tf') {
      const selected = this.answers[q.id];
      html += `<div class="tf-options">
        <div class="tf-option ${selected === 'True'  ? 'selected' : ''}" onclick="ExamPage.selectTF('${q.id}','True',this)">✓ True</div>
        <div class="tf-option false-opt ${selected === 'False' ? 'selected' : ''}" onclick="ExamPage.selectTF('${q.id}','False',this)">✗ False</div>
      </div>`;
    } else if (q.type === 'descriptive') {
      const saved = this.answers[q.id] || '';
      html += `<div style="margin-bottom:.6rem;font-size:.82rem;color:var(--text-muted);font-style:italic">
        Write your answer in detail. Your response is auto-saved as you type.
      </div>
      <textarea class="descriptive-area" id="desc-${q.id}"
        placeholder="Type your detailed answer here…"
        oninput="ExamPage.saveDescriptive('${q.id}', this.value)"
      >${this._escapeHtml(saved)}</textarea>
      <div style="font-size:.75rem;color:var(--text-muted);margin-top:.35rem;text-align:right" id="char-count-${q.id}">
        ${saved.length} characters
      </div>`;
    }

    const isFirst = this.currentIndex === 0;
    const isLast  = this.currentIndex === this.questions.length - 1;

    html += `<div class="test-nav">
      <button class="btn btn-ghost" onclick="ExamPage.prev()" ${isFirst ? 'disabled' : ''}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        Previous
      </button>
      <div style="display:flex;gap:.65rem;align-items:center">
        <span id="save-indicator" style="font-size:.75rem;color:var(--emerald);opacity:0;transition:opacity .3s">✓ Saved</span>
        ${isLast
          ? `<button class="btn btn-success" onclick="ExamPage.confirmSubmit()">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
               Submit Test
             </button>`
          : `<button class="btn btn-primary" onclick="ExamPage.next()">
               Next
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
             </button>`}
      </div>
    </div>`;

    container.innerHTML = html;
    container.style.animation = 'none';
    void container.offsetHeight; // reflow
    container.style.animation  = 'questionSlide .28s ease';

    this._updateProgress();
    this._renderNavGrid();
  },

  _updateProgress() {
    const answered = Object.keys(this.answers).filter(k => this.answers[k] !== '' && this.answers[k] !== undefined).length;
    const total    = this.questions.length;
    const pct      = total > 0 ? Math.round((answered / total) * 100) : 0;

    const fill    = document.getElementById('progress-fill');
    const info    = document.getElementById('progress-info');
    const pctEl   = document.getElementById('progress-pct');

    if (fill)  fill.style.width      = pct + '%';
    if (info)  info.textContent      = `${answered} of ${total} answered`;
    if (pctEl) pctEl.textContent     = pct + '%';
  },

  // ── Answer handlers ──
  selectOption(questionId, optionKey, clickedEl) {
    this.answers[questionId] = optionKey;
    document.querySelectorAll('.option-item').forEach(o => o.classList.remove('selected'));
    clickedEl.classList.add('selected');
    this._saveAnswer(questionId, optionKey);
    this._updateProgress();
    this._renderNavGrid();
  },

  selectTF(questionId, value, clickedEl) {
    this.answers[questionId] = value;
    document.querySelectorAll('.tf-option').forEach(o => o.classList.remove('selected'));
    clickedEl.classList.add('selected');
    this._saveAnswer(questionId, value);
    this._updateProgress();
    this._renderNavGrid();
  },

  saveDescriptive(questionId, value) {
    this.answers[questionId] = value;
    const counter = document.getElementById(`char-count-${questionId}`);
    if (counter) counter.textContent = value.length + ' characters';
    this._updateProgress();
    this._renderNavGrid();
    clearTimeout(this._descTimers[questionId]);
    this._descTimers[questionId] = setTimeout(() => this._saveAnswer(questionId, value), 1000);
  },

  async _saveAnswer(questionId, answer) {
    const indicator = document.getElementById('save-indicator');
    try {
      await API.saveAnswer(this.attempt.id, questionId, answer);
      if (indicator) {
        indicator.style.opacity = '1';
        setTimeout(() => { indicator.style.opacity = '0'; }, 1500);
      }
    } catch(e) {
      // Silent fail — answer is already in local state
    }
  },

  // ── Navigation ──
  prev()   { if (this.currentIndex > 0) { this.currentIndex--; this._renderQuestion(); } },
  next()   { if (this.currentIndex < this.questions.length - 1) { this.currentIndex++; this._renderQuestion(); } },
  goTo(i)  { this.currentIndex = i; this._renderQuestion(); },

  confirmSubmit() {
    const answered   = Object.keys(this.answers).filter(k => this.answers[k] !== '' && this.answers[k] !== undefined).length;
    const unanswered = this.questions.length - answered;
    const msg = unanswered > 0
      ? `You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Are you sure you want to submit?`
      : 'Are you sure you want to submit your exam? This action cannot be undone.';

    const msgEl = document.getElementById('submit-confirm-msg');
    if (msgEl) msgEl.textContent = msg;
    Modal.open('submit-confirm-modal');
  },

  async submit(autoSubmit = false) {
    Modal.closeAll();
    ExamTimer.stop();
    Loading.show('Submitting your exam…');
    try {
      const result = await API.submitAttempt(this.attempt.id, this.answers);
      if (result.success) {
        Loading.hide();
        App.showPage('completion');

        const courseEl = document.getElementById('completion-course-name');
        const timeEl   = document.getElementById('completion-time');
        if (courseEl) courseEl.textContent = this.course.name;
        if (timeEl)   timeEl.textContent   = new Date().toLocaleString('en-IN', { dateStyle:'long', timeStyle:'short' });

        if (autoSubmit) Toast.info('Your exam was automatically submitted when time expired.');
      } else {
        Loading.hide();
        Toast.error(result.message || 'Submission failed. Please try again.');
      }
    } catch(e) {
      Loading.hide();
      Toast.error('Submission error. Please check your connection and try again.');
    }
  },

  _escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  },
};
