/**
 * EVERIUM TEST PLATFORM — QUESTION MANAGEMENT v2.0
 * • Unlimited questions per course
 * • Course-specific question banks
 * • No fixed MCQ/TF/Descriptive limits
 * • Integrated with Course Test Management
 */

const QuestionMgr = {
  questions:        [],
  courses:          [],
  currentType:      'mcq',
  editingId:        null,
  filterCourseId:   null,   // set by CourseMgr when coming from Course Test Management
  filterCourseName: null,

  async init() {
    Loading.show('Loading question bank…');
    try {
      const [coursesRes, qRes] = await Promise.all([
        API.getCourses('admin'),
        API.getQuestions(this.filterCourseId || null),
      ]);
      if (coursesRes.success) this.courses = coursesRes.data;
      if (qRes.success) {
        this.questions = qRes.data;
        this.renderHeader();
        this.renderCounts();
        this.renderList(this.currentType);
      }
    } catch(e) { Toast.error('Failed to load questions.'); }
    finally { Loading.hide(); }
  },

  renderHeader() {
    const hdr = document.getElementById('qbank-header');
    if (!hdr) return;
    if (this.filterCourseId && this.filterCourseName) {
      hdr.innerHTML = `<div>
        <div style="font-size:.72rem;color:var(--text-muted);margin-bottom:.2rem;text-transform:uppercase;letter-spacing:.06em">Question Bank for</div>
        <h3 style="color:var(--navy);font-weight:800">${this.filterCourseName}</h3>
      </div>
      <div style="display:flex;gap:.5rem;align-items:center">
        <button class="btn btn-ghost btn-sm" onclick="QuestionMgr.clearFilter()">← All Courses</button>
        <button class="btn btn-primary btn-sm" onclick="QuestionMgr.openCreate()">+ Add Question</button>
      </div>`;
    } else {
      hdr.innerHTML = `<div>
        <h3 class="card-title">Question Bank</h3>
        <p style="font-size:.75rem;color:var(--text-muted);margin-top:.2rem">Questions are linked to specific courses. Unlimited questions allowed.</p>
      </div>
      <button class="btn btn-primary btn-sm" onclick="QuestionMgr.openCreate()">+ Add Question</button>`;
    }
  },

  clearFilter() {
    this.filterCourseId   = null;
    this.filterCourseName = null;
    this.renderHeader();
    this.renderCounts();
    this.renderList(this.currentType);
  },

  renderCounts() {
    const filtered = this.filterCourseId
      ? this.questions.filter(q => q.courseId === this.filterCourseId)
      : this.questions;

    const mcqCount  = filtered.filter(q => q.type === 'mcq').length;
    const tfCount   = filtered.filter(q => q.type === 'tf').length;
    const descCount = filtered.filter(q => q.type === 'descriptive').length;
    const total     = filtered.length;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('mcq-count',  mcqCount);
    set('tf-count',   tfCount);
    set('desc-count', descCount);
    set('total-q-count', total);
  },

  switchType(type) {
    this.currentType = type;
    document.querySelectorAll('.q-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-qtype="${type}"]`)?.classList.add('active');
    this.renderList(type);
  },

  renderList(type) {
    const container = document.getElementById('questions-list');
    if (!container) return;

    let filtered = this.questions.filter(q => q.type === type);
    if (this.filterCourseId) filtered = filtered.filter(q => q.courseId === this.filterCourseId);
    filtered.sort((a, b) => (Number(a.order)||0) - (Number(b.order)||0));

    if (!filtered.length) {
      const labels = { mcq:'Multiple Choice', tf:'True/False', descriptive:'Descriptive' };
      container.innerHTML = `<div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <h3>No ${labels[type]||type} questions yet</h3>
        <p>Click "Add Question" to create your first question.${this.filterCourseId ? ' Questions are unlimited.' : ''}</p>
        <button class="btn btn-primary btn-sm" style="margin-top:1rem" onclick="QuestionMgr.openCreate()">Add Question</button>
      </div>`;
      return;
    }

    container.innerHTML = filtered.map(q => {
      const course = this.courses.find(c => c.id === q.courseId);
      let detail = '';
      if (q.type === 'mcq') {
        detail = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:.4rem;margin-top:.75rem">
          ${['A','B','C','D'].map(opt => `
            <div style="font-size:.8rem;padding:.3rem .6rem;border-radius:4px;background:${q.correct===opt?'rgba(16,185,129,.1)':'var(--off-white)'};border:1px solid ${q.correct===opt?'var(--emerald)':'var(--border)'}">
              <strong style="color:${q.correct===opt?'var(--emerald-dark)':'var(--text-muted)'}">${opt}${q.correct===opt?' ✓':''}:</strong>
              ${q['option'+opt]||''}
            </div>`).join('')}
        </div>`;
      } else if (q.type === 'tf') {
        detail = `<div style="margin-top:.5rem;font-size:.82rem">
          <span style="background:rgba(16,185,129,.1);color:var(--emerald-dark);padding:.2rem .6rem;border-radius:4px;border:1px solid var(--emerald)">
            Correct: ${q.correct}
          </span>
        </div>`;
      }

      return `
        <div class="accordion-item" id="q-item-${q.id}">
          <div class="accordion-header" onclick="this.parentElement.classList.toggle('open')">
            <span>
              <strong style="color:var(--text-muted);margin-right:.5rem">Q${q.order}.</strong>
              ${q.text.substring(0,120)}${q.text.length>120?'…':''}
              ${!this.filterCourseId && course ? `<span class="badge badge-info" style="font-size:.65rem;margin-left:.5rem">${course.name}</span>` : ''}
            </span>
            <div style="display:flex;align-items:center;gap:.6rem;flex-shrink:0">
              <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();QuestionMgr.openEdit('${q.id}')">Edit</button>
              <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();QuestionMgr.deleteQuestion('${q.id}')">Delete</button>
              <svg class="accordion-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
          <div class="accordion-body">
            <p style="font-size:.9rem;color:var(--text-primary);margin-bottom:.5rem">${q.text}</p>
            ${detail}
            <div style="display:flex;gap:1rem;margin-top:.6rem">
              ${q.marks ? `<span style="font-size:.78rem;color:var(--text-muted)">Marks: ${q.marks}</span>` : ''}
              ${course ? `<span style="font-size:.78rem;color:var(--text-muted)">Course: ${course.name}</span>` : ''}
            </div>
          </div>
        </div>`;
    }).join('');
  },

  _populateCourseOptions(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = this.courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    if (this.filterCourseId) sel.value = this.filterCourseId;
  },

  openCreate() {
    this.editingId = null;
    document.getElementById('q-modal-title').textContent = 'Add Question';
    this._populateCourseOptions('qf-course');
    this._resetForm();
    document.getElementById('qf-type').value = this.currentType;
    this.onTypeChange();
    clearAlert('q-form-alert');

    // Auto-set order: count existing + 1
    const activeCourseId = this.filterCourseId || (this.courses[0]?.id || '');
    document.getElementById('qf-course').value = activeCourseId;
    const count = this.questions.filter(q => q.type === this.currentType && q.courseId === activeCourseId).length;
    document.getElementById('qf-order').value = count + 1;

    Modal.open('question-modal');
  },

  _resetForm() {
    ['qf-text','qf-optA','qf-optB','qf-optC','qf-optD'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    const marks = document.getElementById('qf-marks');
    if (marks) marks.value = 1;
    const correct = document.getElementById('qf-correct');
    if (correct) correct.value = 'A';
    const tfCorrect = document.getElementById('qf-tf-correct');
    if (tfCorrect) tfCorrect.value = 'True';
  },

  openEdit(questionId) {
    const q = this.questions.find(x => x.id === questionId);
    if (!q) return;
    this.editingId = questionId;
    document.getElementById('q-modal-title').textContent = 'Edit Question';
    this._populateCourseOptions('qf-course');
    document.getElementById('qf-type').value   = q.type;
    document.getElementById('qf-course').value = q.courseId;
    document.getElementById('qf-order').value  = q.order;
    document.getElementById('qf-text').value   = q.text;
    const marks = document.getElementById('qf-marks');
    if (marks) marks.value = q.marks || 1;
    this.onTypeChange();
    if (q.type === 'mcq') {
      document.getElementById('qf-optA').value    = q.optionA || '';
      document.getElementById('qf-optB').value    = q.optionB || '';
      document.getElementById('qf-optC').value    = q.optionC || '';
      document.getElementById('qf-optD').value    = q.optionD || '';
      document.getElementById('qf-correct').value = q.correct || 'A';
    } else if (q.type === 'tf') {
      document.getElementById('qf-tf-correct').value = q.correct || 'True';
    }
    clearAlert('q-form-alert');
    Modal.open('question-modal');
  },

  onTypeChange() {
    const type = document.getElementById('qf-type').value;
    document.getElementById('mcq-fields')?.classList.toggle('hidden', type !== 'mcq');
    document.getElementById('tf-fields')?.classList.toggle('hidden',  type !== 'tf');
  },

  async saveQuestion() {
    clearAlert('q-form-alert');
    const type     = document.getElementById('qf-type').value;
    const courseId = document.getElementById('qf-course').value;
    const order    = parseInt(document.getElementById('qf-order').value) || 1;
    const text     = document.getElementById('qf-text').value.trim();
    const marks    = parseInt(document.getElementById('qf-marks')?.value) || 1;

    if (!text)     { showAlert('q-form-alert', 'Question text is required.', 'error'); return; }
    if (!courseId) { showAlert('q-form-alert', 'Please select a course.',    'error'); return; }

    const qData = { type, courseId, order, text, marks };

    if (type === 'mcq') {
      qData.optionA = document.getElementById('qf-optA').value.trim();
      qData.optionB = document.getElementById('qf-optB').value.trim();
      qData.optionC = document.getElementById('qf-optC').value.trim();
      qData.optionD = document.getElementById('qf-optD').value.trim();
      qData.correct = document.getElementById('qf-correct').value;
      if (!qData.optionA || !qData.optionB || !qData.optionC || !qData.optionD) {
        showAlert('q-form-alert', 'All four MCQ options are required.', 'error'); return;
      }
    }
    if (type === 'tf') {
      qData.correct = document.getElementById('qf-tf-correct').value;
    }

    const btn = document.getElementById('q-form-submit');
    if (btn) btn.classList.add('loading');
    try {
      let result;
      if (this.editingId) {
        result = await API.updateQuestion(this.editingId, qData);
      } else {
        result = await API.createQuestion(qData);
      }
      if (result.success) {
        Toast.success(this.editingId ? 'Question updated.' : 'Question added.');
        Modal.close('question-modal');
        await this.init();
        // Refresh count in CourseMgr if active
        if (CourseMgr.selectedCourse) CourseMgr.refreshQuestionCounts();
      } else {
        showAlert('q-form-alert', result.message || 'Failed to save question.', 'error');
      }
    } catch(e) {
      showAlert('q-form-alert', 'Connection error. Please try again.', 'error');
    } finally {
      if (btn) btn.classList.remove('loading');
    }
  },

  async deleteQuestion(questionId) {
    if (!confirm('Delete this question? This cannot be undone.')) return;
    try {
      const result = await API.deleteQuestion(questionId);
      if (result.success) {
        Toast.success('Question deleted.');
        await this.init();
        if (CourseMgr.selectedCourse) CourseMgr.refreshQuestionCounts();
      } else {
        Toast.error(result.message || 'Delete failed.');
      }
    } catch(e) { Toast.error('Connection error.'); }
  },

  async bulkDelete(type) {
    const courseId = this.filterCourseId;
    if (!courseId) { Toast.error('Select a course first (via Course Test Management).'); return; }
    const label = type ? `all ${type.toUpperCase()} questions` : 'ALL questions';
    if (!confirm(`Delete ${label} for "${this.filterCourseName}"? This cannot be undone.`)) return;
    try {
      const res = await API.bulkDeleteQuestions(courseId, type || null);
      if (res.success) { Toast.success('Questions deleted.'); await this.init(); }
      else Toast.error('Delete failed.');
    } catch(e) { Toast.error('Connection error.'); }
  },
};
