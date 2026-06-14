/**
 * EVERIUM TEST PLATFORM — QUESTION MANAGEMENT MODULE
 */

const QuestionMgr = {
  questions: [],
  courses: [],
  currentType: 'mcq',
  editingId: null,

  async init() {
    Loading.show('Loading questions…');
    try {
      const [coursesRes, qRes] = await Promise.all([API.getCourses(), API.getQuestions()]);
      if (coursesRes.success) this.courses = coursesRes.data;
      if (qRes.success) {
        this.questions = qRes.data;
        this.renderCounts();
        this.renderList(this.currentType);
      }
    } catch(e) { Toast.error('Failed to load questions.'); }
    finally { Loading.hide(); }
  },

  renderCounts() {
    const mcqCount  = this.questions.filter(q => q.type === 'mcq').length;
    const tfCount   = this.questions.filter(q => q.type === 'tf').length;
    const descCount = this.questions.filter(q => q.type === 'descriptive').length;

    document.getElementById('mcq-count').textContent  = `${mcqCount}/15`;
    document.getElementById('tf-count').textContent   = `${tfCount}/10`;
    document.getElementById('desc-count').textContent = `${descCount}/5`;

    const total = mcqCount + tfCount + descCount;
    document.getElementById('total-q-count').textContent = `${total}/30`;
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

    const filtered = this.questions.filter(q => q.type === type).sort((a,b) => a.order - b.order);

    if (!filtered.length) {
      container.innerHTML = `<div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <h3>No ${type === 'mcq' ? 'MCQ' : type === 'tf' ? 'True/False' : 'Descriptive'} questions yet</h3>
        <p>Click "Add Question" to create one.</p>
      </div>`;
      return;
    }

    container.innerHTML = filtered.map((q, i) => {
      let detail = '';
      if (q.type === 'mcq') {
        detail = `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.4rem;margin-top:0.75rem">
            ${['A','B','C','D'].map(opt => `
              <div style="font-size:0.8rem;padding:0.3rem 0.6rem;border-radius:4px;background:${q.correct === opt ? 'rgba(16,185,129,0.1)' : 'var(--off-white)'};border:1px solid ${q.correct === opt ? 'var(--emerald)' : 'var(--border)'}">
                <strong style="color:${q.correct === opt ? 'var(--emerald-dark)' : 'var(--text-muted)'}">
                  ${opt}${q.correct === opt ? ' ✓' : ''}:
                </strong>
                ${q['option' + opt] || ''}
              </div>
            `).join('')}
          </div>`;
      } else if (q.type === 'tf') {
        detail = `<div style="margin-top:0.5rem;font-size:0.82rem">
          <span style="background:rgba(16,185,129,0.1);color:var(--emerald-dark);padding:0.2rem 0.6rem;border-radius:4px;border:1px solid var(--emerald)">
            Correct: ${q.correct}
          </span>
        </div>`;
      }

      return `
        <div class="accordion-item" id="q-item-${q.id}">
          <div class="accordion-header" onclick="this.parentElement.classList.toggle('open')">
            <span>
              <strong style="color:var(--text-muted);margin-right:0.5rem">Q${q.order}.</strong>
              ${q.text.substring(0, 100)}${q.text.length > 100 ? '…' : ''}
            </span>
            <div style="display:flex;align-items:center;gap:0.75rem;flex-shrink:0">
              <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();QuestionMgr.openEdit('${q.id}')">Edit</button>
              <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();QuestionMgr.deleteQuestion('${q.id}')">Delete</button>
              <svg class="accordion-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
          <div class="accordion-body">
            <p style="font-size:0.9rem;color:var(--text-primary);margin-bottom:0.5rem">${q.text}</p>
            ${detail}
            ${q.marks ? `<p style="font-size:0.78rem;color:var(--text-muted);margin-top:0.5rem">Marks: ${q.marks}</p>` : ''}
          </div>
        </div>`;
    }).join('');
  },

  _populateCourseOptions() {
    const select = document.getElementById('qf-course');
    select.innerHTML = this.courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  },

  openCreate() {
    this.editingId = null;
    document.getElementById('q-modal-title').textContent = 'Add Question';
    this._populateCourseOptions();
    this._resetForm();
    document.getElementById('qf-type').value = this.currentType;
    this.onTypeChange();
    clearAlert('q-form-alert');

    // Auto-set order
    const count = this.questions.filter(q => q.type === this.currentType).length;
    document.getElementById('qf-order').value = count + 1;
    document.getElementById('qf-course').value = this.courses[0]?.id || '';

    Modal.open('question-modal');
  },

  _resetForm() {
    ['qf-text','qf-optA','qf-optB','qf-optC','qf-optD'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('qf-marks').value = 1;
    document.getElementById('qf-correct').value = 'A';
    document.getElementById('qf-tf-correct').value = 'True';
  },

  openEdit(questionId) {
    const q = this.questions.find(x => x.id === questionId);
    if (!q) return;

    this.editingId = questionId;
    document.getElementById('q-modal-title').textContent = 'Edit Question';
    this._populateCourseOptions();
    document.getElementById('qf-type').value   = q.type;
    document.getElementById('qf-course').value = q.courseId;
    document.getElementById('qf-order').value  = q.order;
    document.getElementById('qf-text').value   = q.text;
    document.getElementById('qf-marks').value  = q.marks || 1;

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
    document.getElementById('mcq-fields').classList.toggle('hidden', type !== 'mcq');
    document.getElementById('tf-fields').classList.toggle('hidden', type !== 'tf');
  },

  async saveQuestion() {
    clearAlert('q-form-alert');

    const type     = document.getElementById('qf-type').value;
    const courseId = document.getElementById('qf-course').value;
    const order    = parseInt(document.getElementById('qf-order').value);
    const text     = document.getElementById('qf-text').value.trim();
    const marks    = parseInt(document.getElementById('qf-marks').value) || 1;

    if (!text) { showAlert('q-form-alert', 'Question text is required.', 'error'); return; }
    if (!courseId) { showAlert('q-form-alert', 'Please select a course.', 'error'); return; }

    const qData = { type, courseId, order, text, marks };

    if (type === 'mcq') {
      qData.optionA = document.getElementById('qf-optA').value.trim();
      qData.optionB = document.getElementById('qf-optB').value.trim();
      qData.optionC = document.getElementById('qf-optC').value.trim();
      qData.optionD = document.getElementById('qf-optD').value.trim();
      qData.correct = document.getElementById('qf-correct').value;

      if (!qData.optionA || !qData.optionB || !qData.optionC || !qData.optionD) {
        showAlert('q-form-alert', 'All four MCQ options are required.', 'error');
        return;
      }
    }

    if (type === 'tf') {
      qData.correct = document.getElementById('qf-tf-correct').value;
    }

    const btn = document.getElementById('q-form-submit');
    btn.classList.add('loading');

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
      } else {
        showAlert('q-form-alert', result.message || 'Failed to save question.', 'error');
      }
    } catch(e) {
      showAlert('q-form-alert', 'Connection error.', 'error');
    } finally { btn.classList.remove('loading'); }
  },

  async deleteQuestion(questionId) {
    if (!confirm('Delete this question? This cannot be undone.')) return;
    try {
      const result = await API.deleteQuestion(questionId);
      if (result.success) {
        Toast.success('Question deleted.');
        await this.init();
      } else {
        Toast.error(result.message || 'Delete failed.');
      }
    } catch(e) { Toast.error('Connection error.'); }
  },
};
