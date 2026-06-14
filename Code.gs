/**
 * ════════════════════════════════════════════════════════════
 *  EVERIUM TEST PLATFORM — GOOGLE APPS SCRIPT BACKEND
 * ════════════════════════════════════════════════════════════
 *
 * SETUP INSTRUCTIONS:
 * 1. Create a Google Sheet named "Everium Test Platform DB"
 * 2. Create the following sheet tabs (exact names, case sensitive):
 *      Users, Courses, Questions, Attempts, Responses, Sessions
 * 3. Open Extensions > Apps Script
 * 4. Delete any default code and paste this entire file
 * 5. Run the `setupSheets` function ONCE from the editor toolbar
 *    (select "setupSheets" from the function dropdown, click Run)
 *    This will create headers and populate default data automatically.
 * 6. Click Deploy > New deployment
 *      - Type: Web app
 *      - Execute as: Me
 *      - Who has access: Anyone
 * 7. Copy the Web App URL and paste it into js/config.js as API_URL
 * 8. Set DEMO_MODE = false in js/config.js
 *
 * ════════════════════════════════════════════════════════════
 */

// ════════════════════════════════════════════════════════════
//  CONFIGURATION
// ════════════════════════════════════════════════════════════

const SHEET_NAMES = {
  USERS: 'Users',
  COURSES: 'Courses',
  QUESTIONS: 'Questions',
  ATTEMPTS: 'Attempts',
  RESPONSES: 'Responses',
  SESSIONS: 'Sessions',
};

const EXAM_DURATION_SECONDS = 45 * 60; // 45 minutes

// ════════════════════════════════════════════════════════════
//  ENTRY POINTS — doGet / doPost
// ════════════════════════════════════════════════════════════

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  let params = {};
  try {
    params = JSON.parse(e.postData.contents);
  } catch (err) {
    params = e.parameter;
  }
  return handleRequest({ parameter: params, isPost: true });
}

function handleRequest(e) {
  try {
    const action = getParam(e, 'action');
    let result;

    switch (action) {
      // AUTH
      case 'login':            result = loginUser(e); break;
      case 'logout':           result = logoutUser(e); break;

      // USERS
      case 'getUsers':         result = getUsers(e); break;
      case 'createUser':       result = createUser(e); break;
      case 'updateUser':       result = updateUser(e); break;
      case 'deleteUser':        result = deleteUser(e); break;
      case 'toggleUserStatus':  result = toggleUserStatus(e); break;

      // COURSES
      case 'getCourses':       result = getCourses(e); break;

      // QUESTIONS
      case 'getQuestions':      result = getQuestions(e); break;
      case 'createQuestion':    result = createQuestion(e); break;
      case 'updateQuestion':    result = updateQuestion(e); break;
      case 'deleteQuestion':    result = deleteQuestion(e); break;

      // ATTEMPTS
      case 'getAttempt':        result = getAttempt(e); break;
      case 'startAttempt':      result = startAttempt(e); break;
      case 'saveAnswer':         result = saveAnswer(e); break;
      case 'submitAttempt':     result = submitAttempt(e); break;
      case 'resetAttempt':      result = resetAttempt(e); break;
      case 'syncTimer':          result = syncTimer(e); break;

      // RESULTS / ANALYTICS
      case 'getResults':         result = getResults(e); break;
      case 'getStudentResults':  result = getStudentResults(e); break;
      case 'getAnalytics':       result = getAnalytics(e); break;

      default:
        result = { success: false, message: 'Unknown action: ' + action };
    }

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ success: false, message: 'Server error: ' + err.message });
  }
}

// ════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════

function getParam(e, key) {
  if (!e || !e.parameter) return null;
  let val = e.parameter[key];
  if (val === undefined || val === null) return null;
  // Try to parse JSON-encoded values (from GET requests)
  try { return JSON.parse(val); } catch (err) { return val; }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  const rows = data.slice(1);
  return rows
    .filter(row => row.some(cell => cell !== '' && cell !== null))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        let val = row[i];
        // Convert Date objects to ISO strings
        if (val instanceof Date) val = val.toISOString();
        obj[h] = val;
      });
      return obj;
    });
}

function findRowIndexById(sheet, idColumnName, id) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf(idColumnName);
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) return i + 1; // 1-indexed for sheet rows
  }
  return -1;
}

function getHeaders(sheet) {
  return sheet.getDataRange().getValues()[0];
}

function appendObject(sheet, obj) {
  const headers = getHeaders(sheet);
  const row = headers.map(h => (obj[h] !== undefined ? obj[h] : ''));
  sheet.appendRow(row);
}

function updateRowByObject(sheet, rowIndex, updates) {
  const headers = getHeaders(sheet);
  headers.forEach((h, colIdx) => {
    if (updates[h] !== undefined) {
      sheet.getRange(rowIndex, colIdx + 1).setValue(updates[h]);
    }
  });
}

// Simple hash function for passwords (use with caution; for production use stronger methods)
function hashPassword(password) {
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8);
  return rawHash.map(byte => {
    const v = (byte < 0 ? byte + 256 : byte).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function generateId(prefix) {
  return prefix + '_' + Utilities.getUuid().split('-')[0];
}

function nowISO() {
  return new Date().toISOString();
}

// ════════════════════════════════════════════════════════════
//  SETUP — Run once to initialize the spreadsheet
// ════════════════════════════════════════════════════════════

function setupSheets() {
  setupUsersSheet();
  setupCoursesSheet();
  setupQuestionsSheet();
  setupAttemptsSheet();
  setupResponsesSheet();
  setupSessionsSheet();

  SpreadsheetApp.getActiveSpreadsheet().toast('Everium Test Platform — Database setup complete!', 'Setup', 5);
}

function setupUsersSheet() {
  const sheet = getSheet(SHEET_NAMES.USERS);
  sheet.clear();
  const headers = ['id', 'username', 'passwordHash', 'name', 'role', 'email', 'active', 'createdAt'];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0F172A').setFontColor('#FFFFFF');

  const users = [
    { username: 'admin01', password: 'Admin@123', name: 'Administrator', role: 'admin', email: 'admin@everium.edu' },
    { username: 'teacher01', password: 'Teacher@123', name: 'Teacher One', role: 'teacher', email: 'teacher1@everium.edu' },
    { username: 'teacher02', password: 'Teacher@123', name: 'Teacher Two', role: 'teacher', email: 'teacher2@everium.edu' },
  ];
  for (let i = 1; i <= 10; i++) {
    const num = String(i).padStart(2, '0');
    users.push({ username: 'student' + num, password: 'Student@123', name: 'Student ' + numberToWord(i), role: 'student', email: 'student' + i + '@everium.edu' });
  }

  users.forEach(u => {
    sheet.appendRow([
      generateId('u'),
      u.username,
      hashPassword(u.password),
      u.name,
      u.role,
      u.email,
      true,
      nowISO()
    ]);
  });

  sheet.autoResizeColumns(1, headers.length);
}

function numberToWord(n) {
  const words = ['', 'One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten'];
  return words[n] || String(n);
}

function setupCoursesSheet() {
  const sheet = getSheet(SHEET_NAMES.COURSES);
  sheet.clear();
  const headers = ['id', 'code', 'name', 'description', 'duration', 'totalQuestions', 'active', 'createdAt'];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0F172A').setFontColor('#FFFFFF');

  sheet.appendRow([
    generateId('c'),
    'DMF101',
    'Digital Marketing Fundamentals',
    'A comprehensive assessment covering SEO, SEM, Social Media, Content Marketing, and Analytics.',
    45,
    30,
    true,
    nowISO()
  ]);

  sheet.autoResizeColumns(1, headers.length);
}

function setupQuestionsSheet() {
  const sheet = getSheet(SHEET_NAMES.QUESTIONS);
  sheet.clear();
  const headers = ['id', 'courseId', 'type', 'order', 'text', 'optionA', 'optionB', 'optionC', 'optionD', 'correct', 'marks'];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0F172A').setFontColor('#FFFFFF');

  // Get course ID
  const coursesSheet = getSheet(SHEET_NAMES.COURSES);
  const courses = sheetToObjects(coursesSheet);
  const courseId = courses.length ? courses[0].id : 'c001';

  const mcqQuestions = [
    ['What does SEO stand for?', 'Search Engine Optimization', 'Social Engine Output', 'Search Engine Operation', 'Site Engagement Optimization', 'A'],
    ['Which of the following is a key metric used in email marketing?', 'Bounce Rate only', 'Open Rate and Click-Through Rate', 'Page Views', 'Domain Authority', 'B'],
    ['What is a "conversion" in digital marketing?', 'Changing your website design', 'A visitor completing a desired action', 'Converting currency for ad spend', 'Switching social media platforms', 'B'],
    ['Which social media platform is best suited for B2B marketing?', 'TikTok', 'Instagram', 'LinkedIn', 'Pinterest', 'C'],
    ['What does CPC stand for in digital advertising?', 'Cost Per Customer', 'Content Per Click', 'Cost Per Click', 'Conversion Per Campaign', 'C'],
    ['Which of the following best describes a "landing page"?', 'The homepage of a website', 'A dedicated page designed to capture leads or drive conversions', 'The footer page of a website', 'An error page', 'B'],
    ['What is the primary purpose of Google Analytics?', 'To run paid advertising campaigns', 'To track and analyze website traffic and user behavior', 'To design website layouts', 'To manage social media posts', 'B'],
    ['What is "content marketing"?', 'Paying for advertisements', 'Creating and distributing valuable content to attract and retain an audience', 'Managing website server content', 'Editing product descriptions', 'B'],
    ['Which element is most important for on-page SEO?', 'Number of social media followers', 'Website color scheme', 'Title tags and meta descriptions', 'Website hosting provider', 'C'],
    ['What does ROI stand for in marketing?', 'Rate of Influence', 'Return on Investment', 'Revenue of Interest', 'Reach of Impact', 'B'],
    ['Which of the following is an example of paid digital marketing?', 'Organic social media posts', 'Blog articles', 'Google Ads (PPC)', 'Email newsletters to existing subscribers', 'C'],
    ['What is a "buyer persona" in marketing?', 'A real customer who makes a purchase', 'A fictional representation of your ideal customer', 'An animated character for ads', 'A legal customer profile document', 'B'],
    ['What does CTR mean in digital advertising?', 'Customer Transaction Rate', 'Content Tracking Ratio', 'Click-Through Rate', 'Campaign Traffic Result', 'C'],
    ['Which type of marketing involves influencers promoting products?', 'Email Marketing', 'Influencer Marketing', 'Search Marketing', 'Display Advertising', 'B'],
    ['What is "remarketing" in digital advertising?', 'Launching a new marketing campaign', 'Marketing to people who have previously visited your website', 'Editing previous advertisements', 'Marketing to new audiences only', 'B'],
  ];

  const tfQuestions = [
    ['Social media marketing can help improve a website\'s organic search rankings.', 'True'],
    ['A high bounce rate always indicates poor website performance.', 'False'],
    ['Email marketing has one of the highest ROIs among digital marketing channels.', 'True'],
    ['PPC advertising guarantees the first position in search engine results.', 'False'],
    ['Mobile optimization is important for digital marketing success.', 'True'],
    ['Keyword stuffing is a recommended SEO practice.', 'False'],
    ['A call-to-action (CTA) is an element that encourages the user to take a specific step.', 'True'],
    ['All digital marketing channels require paid advertising budgets.', 'False'],
    ['A/B testing is a method used to compare two versions of a marketing asset.', 'True'],
    ['Instagram Stories disappear after 48 hours by default.', 'False'],
  ];

  const descQuestions = [
    'Explain the difference between organic and paid digital marketing. Provide at least two examples of each and discuss when a business should prioritize one over the other.',
    'Describe the concept of the "marketing funnel." What are its main stages and how does digital marketing apply at each stage?',
    'What is Search Engine Optimization (SEO)? Explain at least four key on-page SEO factors that a digital marketer should focus on to improve a website\'s ranking.',
    'You are tasked with creating a social media strategy for a new local bakery business. Outline the key steps you would take, including platform selection, content types, and how you would measure success.',
    'What is email marketing and why is it considered one of the most effective digital marketing channels? Describe three best practices for running a successful email marketing campaign.',
  ];

  let order = 1;
  mcqQuestions.forEach(q => {
    sheet.appendRow([generateId('q'), courseId, 'mcq', order++, q[0], q[1], q[2], q[3], q[4], q[5], 1]);
  });
  tfQuestions.forEach(q => {
    sheet.appendRow([generateId('q'), courseId, 'tf', order++, q[0], '', '', '', '', q[1], 1]);
  });
  descQuestions.forEach(q => {
    sheet.appendRow([generateId('q'), courseId, 'descriptive', order++, q, '', '', '', '', '', 5]);
  });

  sheet.autoResizeColumns(1, headers.length);
}

function setupAttemptsSheet() {
  const sheet = getSheet(SHEET_NAMES.ATTEMPTS);
  sheet.clear();
  const headers = ['id', 'userId', 'courseId', 'status', 'startTime', 'endTime', 'remainingSeconds', 'score', 'mcqScore', 'tfScore', 'lastSyncAt'];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0F172A').setFontColor('#FFFFFF');
  sheet.autoResizeColumns(1, headers.length);
}

function setupResponsesSheet() {
  const sheet = getSheet(SHEET_NAMES.RESPONSES);
  sheet.clear();
  const headers = ['id', 'attemptId', 'questionId', 'answer', 'savedAt'];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0F172A').setFontColor('#FFFFFF');
  sheet.autoResizeColumns(1, headers.length);
}

function setupSessionsSheet() {
  const sheet = getSheet(SHEET_NAMES.SESSIONS);
  sheet.clear();
  const headers = ['id', 'userId', 'token', 'loginAt', 'lastActiveAt'];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0F172A').setFontColor('#FFFFFF');
  sheet.autoResizeColumns(1, headers.length);
}

// ════════════════════════════════════════════════════════════
//  AUTH FUNCTIONS
// ════════════════════════════════════════════════════════════

function loginUser(e) {
  const username = getParam(e, 'username');
  const password = getParam(e, 'password');

  if (!username || !password) {
    return { success: false, message: 'Username and password are required.' };
  }

  const sheet = getSheet(SHEET_NAMES.USERS);
  const users = sheetToObjects(sheet);
  const passwordHash = hashPassword(password);

  const user = users.find(u =>
    u.username === username &&
    u.passwordHash === passwordHash
  );

  if (!user) {
    return { success: false, message: 'Invalid username or password.' };
  }

  if (!user.active) {
    return { success: false, message: 'This account has been disabled. Please contact the administrator.' };
  }

  // Create session
  const sessionsSheet = getSheet(SHEET_NAMES.SESSIONS);
  const token = generateId('sess');
  appendObject(sessionsSheet, {
    id: generateId('s'),
    userId: user.id,
    token: token,
    loginAt: nowISO(),
    lastActiveAt: nowISO()
  });

  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      email: user.email,
    },
    session: { token: token }
  };
}

function logoutUser(e) {
  // Sessions are informational; clearing client-side is sufficient
  return { success: true };
}

// ════════════════════════════════════════════════════════════
//  USER MANAGEMENT
// ════════════════════════════════════════════════════════════

function getUsers(e) {
  const role = getParam(e, 'role');
  const sheet = getSheet(SHEET_NAMES.USERS);
  let users = sheetToObjects(sheet);

  if (role) users = users.filter(u => u.role === role);

  // Remove password hashes before sending
  users = users.map(u => {
    const copy = { ...u };
    delete copy.passwordHash;
    return copy;
  });

  return { success: true, data: users };
}

function createUser(e) {
  const userData = getParam(e, 'userData');
  if (!userData || !userData.username || !userData.password) {
    return { success: false, message: 'Username and password are required.' };
  }

  const sheet = getSheet(SHEET_NAMES.USERS);
  const users = sheetToObjects(sheet);

  if (users.find(u => u.username === userData.username)) {
    return { success: false, message: 'Username already exists. Please choose a different username.' };
  }

  const newUser = {
    id: generateId('u'),
    username: userData.username,
    passwordHash: hashPassword(userData.password),
    name: userData.name || userData.username,
    role: userData.role || 'student',
    email: userData.email || '',
    active: true,
    createdAt: nowISO(),
  };

  appendObject(sheet, newUser);

  const result = { ...newUser };
  delete result.passwordHash;
  return { success: true, data: result };
}

function updateUser(e) {
  const userId = getParam(e, 'userId');
  const updates = getParam(e, 'updates');

  if (!userId || !updates) {
    return { success: false, message: 'User ID and updates are required.' };
  }

  const sheet = getSheet(SHEET_NAMES.USERS);
  const rowIndex = findRowIndexById(sheet, 'id', userId);
  if (rowIndex < 0) return { success: false, message: 'User not found.' };

  const users = sheetToObjects(sheet);
  const targetUser = users.find(u => u.id === userId);

  // ── ADMIN PROTECTION CHECK ──
  // If demoting an admin or disabling an admin, ensure at least one active admin remains
  if (targetUser.role === 'admin') {
    const willBeDemoted = updates.role && updates.role !== 'admin';
    const willBeDisabled = updates.active === false;

    if (willBeDemoted || willBeDisabled) {
      const otherActiveAdmins = users.filter(u =>
        u.role === 'admin' && u.active && u.id !== userId
      );
      if (otherActiveAdmins.length === 0) {
        return { success: false, message: 'Operation not permitted. The system must always have at least one active Admin account.' };
      }
    }
  }

  // Check for duplicate username
  if (updates.username && updates.username !== targetUser.username) {
    if (users.find(u => u.username === updates.username && u.id !== userId)) {
      return { success: false, message: 'Username already exists.' };
    }
  }

  // Build update object
  const finalUpdates = { ...updates };
  if (updates.password) {
    finalUpdates.passwordHash = hashPassword(updates.password);
    delete finalUpdates.password;
  }

  updateRowByObject(sheet, rowIndex, finalUpdates);

  return { success: true };
}

function deleteUser(e) {
  const userId = getParam(e, 'userId');
  if (!userId) return { success: false, message: 'User ID is required.' };

  const sheet = getSheet(SHEET_NAMES.USERS);
  const rowIndex = findRowIndexById(sheet, 'id', userId);
  if (rowIndex < 0) return { success: false, message: 'User not found.' };

  const users = sheetToObjects(sheet);
  const targetUser = users.find(u => u.id === userId);

  // ── ADMIN PROTECTION CHECK ──
  if (targetUser.role === 'admin') {
    const otherActiveAdmins = users.filter(u =>
      u.role === 'admin' && u.active && u.id !== userId
    );
    if (otherActiveAdmins.length === 0) {
      return { success: false, message: 'Operation not permitted. The system must always have at least one active Admin account.' };
    }
  }

  sheet.deleteRow(rowIndex);
  return { success: true };
}

function toggleUserStatus(e) {
  const userId = getParam(e, 'userId');
  const active = getParam(e, 'active');

  if (!userId || active === null) return { success: false, message: 'User ID and active status are required.' };

  const sheet = getSheet(SHEET_NAMES.USERS);
  const rowIndex = findRowIndexById(sheet, 'id', userId);
  if (rowIndex < 0) return { success: false, message: 'User not found.' };

  const users = sheetToObjects(sheet);
  const targetUser = users.find(u => u.id === userId);

  // ── ADMIN PROTECTION CHECK ──
  if (!active && targetUser.role === 'admin') {
    const otherActiveAdmins = users.filter(u =>
      u.role === 'admin' && u.active && u.id !== userId
    );
    if (otherActiveAdmins.length === 0) {
      return { success: false, message: 'Operation not permitted. The system must always have at least one active Admin account.' };
    }
  }

  updateRowByObject(sheet, rowIndex, { active: active });
  return { success: true };
}

// ════════════════════════════════════════════════════════════
//  COURSES
// ════════════════════════════════════════════════════════════

function getCourses(e) {
  const sheet = getSheet(SHEET_NAMES.COURSES);
  const courses = sheetToObjects(sheet).filter(c => c.active !== false);
  return { success: true, data: courses };
}

// ════════════════════════════════════════════════════════════
//  QUESTIONS
// ════════════════════════════════════════════════════════════

function getQuestions(e) {
  const courseId = getParam(e, 'courseId');
  const sheet = getSheet(SHEET_NAMES.QUESTIONS);
  let questions = sheetToObjects(sheet);

  if (courseId) questions = questions.filter(q => q.courseId === courseId);

  // For students taking exam, never expose correct answers
  // (this endpoint is also used by admin/teacher, so we keep full data here;
  //  front-end controls what's displayed to students)

  questions.sort((a, b) => (a.order || 0) - (b.order || 0));
  return { success: true, data: questions };
}

function createQuestion(e) {
  const questionData = getParam(e, 'questionData');
  if (!questionData || !questionData.text || !questionData.type) {
    return { success: false, message: 'Question text and type are required.' };
  }

  const sheet = getSheet(SHEET_NAMES.QUESTIONS);
  const newQuestion = {
    id: generateId('q'),
    courseId: questionData.courseId,
    type: questionData.type,
    order: questionData.order || 0,
    text: questionData.text,
    optionA: questionData.optionA || '',
    optionB: questionData.optionB || '',
    optionC: questionData.optionC || '',
    optionD: questionData.optionD || '',
    correct: questionData.correct || '',
    marks: questionData.marks || 1,
  };

  appendObject(sheet, newQuestion);
  return { success: true, data: newQuestion };
}

function updateQuestion(e) {
  const questionId = getParam(e, 'questionId');
  const updates = getParam(e, 'updates');

  if (!questionId || !updates) return { success: false, message: 'Question ID and updates are required.' };

  const sheet = getSheet(SHEET_NAMES.QUESTIONS);
  const rowIndex = findRowIndexById(sheet, 'id', questionId);
  if (rowIndex < 0) return { success: false, message: 'Question not found.' };

  updateRowByObject(sheet, rowIndex, updates);
  return { success: true };
}

function deleteQuestion(e) {
  const questionId = getParam(e, 'questionId');
  if (!questionId) return { success: false, message: 'Question ID is required.' };

  const sheet = getSheet(SHEET_NAMES.QUESTIONS);
  const rowIndex = findRowIndexById(sheet, 'id', questionId);
  if (rowIndex < 0) return { success: false, message: 'Question not found.' };

  sheet.deleteRow(rowIndex);
  return { success: true };
}

// ════════════════════════════════════════════════════════════
//  ATTEMPTS
// ════════════════════════════════════════════════════════════

function getAttempt(e) {
  const userId = getParam(e, 'userId');
  const courseId = getParam(e, 'courseId');

  const sheet = getSheet(SHEET_NAMES.ATTEMPTS);
  const attempts = sheetToObjects(sheet);
  const attempt = attempts.find(a => a.userId === userId && a.courseId === courseId);

  if (!attempt) return { success: true, data: null };

  // Load responses
  const responsesSheet = getSheet(SHEET_NAMES.RESPONSES);
  const responses = sheetToObjects(responsesSheet).filter(r => r.attemptId === attempt.id);

  // Calculate live remaining time based on elapsed time since start
  let remainingSeconds = attempt.remainingSeconds;
  if (attempt.status === 'active' && attempt.startTime) {
    const elapsedSeconds = Math.floor((new Date() - new Date(attempt.startTime)) / 1000);
    const calculatedRemaining = EXAM_DURATION_SECONDS - elapsedSeconds;
    remainingSeconds = Math.max(0, calculatedRemaining);
  }

  return {
    success: true,
    data: {
      ...attempt,
      remainingSeconds: remainingSeconds,
      answers: responses.map(r => ({ questionId: r.questionId, answer: r.answer })),
    }
  };
}

function startAttempt(e) {
  const userId = getParam(e, 'userId');
  const courseId = getParam(e, 'courseId');

  if (!userId || !courseId) return { success: false, message: 'User ID and Course ID are required.' };

  const sheet = getSheet(SHEET_NAMES.ATTEMPTS);
  const attempts = sheetToObjects(sheet);

  // ── SINGLE ATTEMPT RULE ──
  const existing = attempts.find(a => a.userId === userId && a.courseId === courseId);
  if (existing) {
    return { success: false, message: 'An attempt already exists for this user and course.' };
  }

  const newAttempt = {
    id: generateId('att'),
    userId: userId,
    courseId: courseId,
    status: 'active',
    startTime: nowISO(),
    endTime: '',
    remainingSeconds: EXAM_DURATION_SECONDS,
    score: '',
    mcqScore: '',
    tfScore: '',
    lastSyncAt: nowISO(),
  };

  appendObject(sheet, newAttempt);
  return { success: true, data: newAttempt };
}

function saveAnswer(e) {
  const attemptId = getParam(e, 'attemptId');
  const questionId = getParam(e, 'questionId');
  const answer = getParam(e, 'answer');

  if (!attemptId || !questionId) return { success: false, message: 'Attempt ID and Question ID are required.' };

  const sheet = getSheet(SHEET_NAMES.RESPONSES);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const attemptCol = headers.indexOf('attemptId');
  const questionCol = headers.indexOf('questionId');
  const answerCol = headers.indexOf('answer');
  const savedAtCol = headers.indexOf('savedAt');

  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][attemptCol] === attemptId && data[i][questionCol] === questionId) {
      sheet.getRange(i + 1, answerCol + 1).setValue(answer);
      sheet.getRange(i + 1, savedAtCol + 1).setValue(nowISO());
      found = true;
      break;
    }
  }

  if (!found) {
    appendObject(sheet, {
      id: generateId('ans'),
      attemptId: attemptId,
      questionId: questionId,
      answer: answer,
      savedAt: nowISO(),
    });
  }

  return { success: true };
}

function submitAttempt(e) {
  const attemptId = getParam(e, 'attemptId');
  const answers = getParam(e, 'answers') || {};

  if (!attemptId) return { success: false, message: 'Attempt ID is required.' };

  const sheet = getSheet(SHEET_NAMES.ATTEMPTS);
  const rowIndex = findRowIndexById(sheet, 'id', attemptId);
  if (rowIndex < 0) return { success: false, message: 'Attempt not found.' };

  const attempts = sheetToObjects(sheet);
  const attempt = attempts.find(a => a.id === attemptId);

  if (attempt.status === 'completed') {
    return { success: false, message: 'This attempt has already been submitted.' };
  }

  // Get all questions for this course to score MCQ and TF
  const questionsSheet = getSheet(SHEET_NAMES.QUESTIONS);
  const questions = sheetToObjects(questionsSheet).filter(q => q.courseId === attempt.courseId);

  let mcqScore = 0;
  let tfScore = 0;

  // Save all final answers and score
  const responsesSheet = getSheet(SHEET_NAMES.RESPONSES);

  Object.keys(answers).forEach(questionId => {
    const answer = answers[questionId];
    const question = questions.find(q => q.id === questionId);

    if (question) {
      if (question.type === 'mcq' && answer === question.correct) mcqScore++;
      if (question.type === 'tf' && answer === question.correct) tfScore++;
    }

    // Save/update response
    saveAnswer({ parameter: { action: 'saveAnswer', attemptId: JSON.stringify(attemptId), questionId: JSON.stringify(questionId), answer: JSON.stringify(answer) } });
  });

  const totalScore = mcqScore + tfScore;

  updateRowByObject(sheet, rowIndex, {
    status: 'completed',
    endTime: nowISO(),
    score: totalScore,
    mcqScore: mcqScore,
    tfScore: tfScore,
    remainingSeconds: 0,
    lastSyncAt: nowISO(),
  });

  return { success: true, data: { score: totalScore, mcqScore: mcqScore, tfScore: tfScore } };
}

function resetAttempt(e) {
  const userId = getParam(e, 'userId');
  const courseId = getParam(e, 'courseId');

  if (!userId || !courseId) return { success: false, message: 'User ID and Course ID are required.' };

  const sheet = getSheet(SHEET_NAMES.ATTEMPTS);
  const rowIndex = findRowIndexById(sheet, 'id',
    (sheetToObjects(sheet).find(a => a.userId === userId && a.courseId === courseId) || {}).id
  );

  if (rowIndex < 0) return { success: true, message: 'No attempt found to reset.' };

  const attempts = sheetToObjects(sheet);
  const attempt = attempts.find(a => a.userId === userId && a.courseId === courseId);

  // Delete responses for this attempt
  const responsesSheet = getSheet(SHEET_NAMES.RESPONSES);
  const responsesData = responsesSheet.getDataRange().getValues();
  const headers = responsesData[0];
  const attemptCol = headers.indexOf('attemptId');

  // Delete rows in reverse order to avoid index shifting issues
  for (let i = responsesData.length - 1; i >= 1; i--) {
    if (responsesData[i][attemptCol] === attempt.id) {
      responsesSheet.deleteRow(i + 1);
    }
  }

  // Delete the attempt row
  sheet.deleteRow(rowIndex);

  return { success: true };
}

function syncTimer(e) {
  const attemptId = getParam(e, 'attemptId');
  const remainingSeconds = getParam(e, 'remainingSeconds');

  if (!attemptId) return { success: false, message: 'Attempt ID is required.' };

  const sheet = getSheet(SHEET_NAMES.ATTEMPTS);
  const rowIndex = findRowIndexById(sheet, 'id', attemptId);
  if (rowIndex < 0) return { success: false, message: 'Attempt not found.' };

  updateRowByObject(sheet, rowIndex, {
    remainingSeconds: remainingSeconds,
    lastSyncAt: nowISO(),
  });

  return { success: true };
}

// ════════════════════════════════════════════════════════════
//  RESULTS & ANALYTICS
// ════════════════════════════════════════════════════════════

function getResults(e) {
  const courseId = getParam(e, 'courseId');

  const attemptsSheet = getSheet(SHEET_NAMES.ATTEMPTS);
  const usersSheet = getSheet(SHEET_NAMES.USERS);
  const coursesSheet = getSheet(SHEET_NAMES.COURSES);
  const responsesSheet = getSheet(SHEET_NAMES.RESPONSES);

  let attempts = sheetToObjects(attemptsSheet).filter(a => a.status === 'completed');
  if (courseId) attempts = attempts.filter(a => a.courseId === courseId);

  const users = sheetToObjects(usersSheet);
  const courses = sheetToObjects(coursesSheet);
  const responses = sheetToObjects(responsesSheet);

  const results = attempts.map(a => {
    const user = users.find(u => u.id === a.userId);
    const course = courses.find(c => c.id === a.courseId);
    const attemptResponses = responses.filter(r => r.attemptId === a.id);

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
      answers: attemptResponses.map(r => ({ questionId: r.questionId, answer: r.answer })),
    };
  });

  return { success: true, data: results };
}

function getStudentResults(e) {
  // Students cannot view their own results per requirements,
  // but this endpoint exists for potential future admin use
  return { success: false, message: 'Students are not permitted to view results.' };
}

function getAnalytics(e) {
  const usersSheet = getSheet(SHEET_NAMES.USERS);
  const attemptsSheet = getSheet(SHEET_NAMES.ATTEMPTS);
  const questionsSheet = getSheet(SHEET_NAMES.QUESTIONS);

  const users = sheetToObjects(usersSheet);
  const attempts = sheetToObjects(attemptsSheet);
  const questions = sheetToObjects(questionsSheet);

  const totalStudents = users.filter(u => u.role === 'student').length;
  const completedAttempts = attempts.filter(a => a.status === 'completed').length;
  const activeAttempts = attempts.filter(a => a.status === 'active').length;
  const notStarted = Math.max(0, totalStudents - completedAttempts - activeAttempts);

  const completedScores = attempts
    .filter(a => a.status === 'completed' && typeof a.score === 'number')
    .map(a => a.score);

  const averageScore = completedScores.length
    ? Math.round(completedScores.reduce((s, v) => s + v, 0) / completedScores.length)
    : 0;

  const mcqCount = questions.filter(q => q.type === 'mcq').length;
  const tfCount = questions.filter(q => q.type === 'tf').length;
  const maxScore = mcqCount + tfCount;

  return {
    success: true,
    data: {
      totalStudents: totalStudents,
      completedAttempts: completedAttempts,
      activeAttempts: activeAttempts,
      notStarted: notStarted,
      averageScore: averageScore,
      maxScore: maxScore,
    }
  };
}
