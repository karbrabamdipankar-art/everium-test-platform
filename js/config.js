/**
 * EVERIUM TEST PLATFORM — CONFIGURATION
 * ======================================
 * IMPORTANT: After deploying Google Apps Script,
 * replace the API_URL below with your Web App URL.
 *
 * Do NOT change anything else unless instructed.
 */

const CONFIG = {
  // ── Replace this URL after deploying Google Apps Script ──
  API_URL: 'https://script.google.com/macros/s/AKfycbxGRTgwrB4SBl5XsZIy5M05vc6eVbrT4yFiFji6cdtz4KLqty-GbKK-ygSe-a1W9rZNBg/exec',

  // Platform Settings
  PLATFORM_NAME: 'Everium Test Platform',
  PLATFORM_TAGLINE: 'Excellence in Assessment',
  EXAM_DURATION_MINUTES: 45,
  TOTAL_QUESTIONS: 30,
  MCQ_COUNT: 15,
  TF_COUNT: 10,
  DESC_COUNT: 5,

  // Session
  SESSION_KEY: 'everium_session',
  ANSWERS_KEY: 'everium_answers',
  TIMER_KEY: 'everium_timer',

  // Demo/Fallback mode (set to false after Google Sheets setup)
  DEMO_MODE: false,
};

// ── Hash function for password comparison ──
// Passwords are stored as SHA-256 hashes in Google Sheets
// This is a client-side helper only; never send plain passwords
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Default accounts (used in DEMO_MODE only) ──
// In production these live in Google Sheets with hashed passwords
const DEMO_USERS = [
  {
    id: 'u001', username: 'admin01', role: 'admin', name: 'Administrator',
    passwordHash: '6da459b4a5b6e38c5e7b8d3f9c0d2e1a4f7b8c9d0e1f2a3b4c5d6e7f8a9b0c1', // placeholder
    password: 'Admin@123', active: true, email: 'admin@everium.edu'
  },
  {
    id: 'u002', username: 'teacher01', role: 'teacher', name: 'Teacher One',
    password: 'Teacher@123', active: true, email: 'teacher1@everium.edu'
  },
  {
    id: 'u003', username: 'teacher02', role: 'teacher', name: 'Teacher Two',
    password: 'Teacher@123', active: true, email: 'teacher2@everium.edu'
  },
  {
    id: 'u004', username: 'student01', role: 'student', name: 'Student One',
    password: 'Student@123', active: true, email: 'student1@everium.edu'
  },
  {
    id: 'u005', username: 'student02', role: 'student', name: 'Student Two',
    password: 'Student@123', active: true, email: 'student2@everium.edu'
  },
  {
    id: 'u006', username: 'student03', role: 'student', name: 'Student Three',
    password: 'Student@123', active: true, email: 'student3@everium.edu'
  },
  {
    id: 'u007', username: 'student04', role: 'student', name: 'Student Four',
    password: 'Student@123', active: true, email: 'student4@everium.edu'
  },
  {
    id: 'u008', username: 'student05', role: 'student', name: 'Student Five',
    password: 'Student@123', active: true, email: 'student5@everium.edu'
  },
  {
    id: 'u009', username: 'student06', role: 'student', name: 'Student Six',
    password: 'Student@123', active: true, email: 'student6@everium.edu'
  },
  {
    id: 'u010', username: 'student07', role: 'student', name: 'Student Seven',
    password: 'Student@123', active: true, email: 'student7@everium.edu'
  },
  {
    id: 'u011', username: 'student08', role: 'student', name: 'Student Eight',
    password: 'Student@123', active: true, email: 'student8@everium.edu'
  },
  {
    id: 'u012', username: 'student09', role: 'student', name: 'Student Nine',
    password: 'Student@123', active: true, email: 'student9@everium.edu'
  },
  {
    id: 'u013', username: 'student10', role: 'student', name: 'Student Ten',
    password: 'Student@123', active: true, email: 'student10@everium.edu'
  },
];

const DEMO_COURSES = [
  {
    id: 'c001',
    code: 'DMF101',
    name: 'Digital Marketing Fundamentals',
    description: 'A comprehensive assessment covering SEO, SEM, Social Media, Content Marketing, and Analytics.',
    duration: 45,
    totalQuestions: 30,
    active: true
  }
];

const DEMO_QUESTIONS = [
  // ── MCQ Questions (1-15) ──
  { id: 'q001', courseId: 'c001', type: 'mcq', order: 1, text: 'What does SEO stand for?', optionA: 'Search Engine Optimization', optionB: 'Social Engine Output', optionC: 'Search Engine Operation', optionD: 'Site Engagement Optimization', correct: 'A', marks: 1 },
  { id: 'q002', courseId: 'c001', type: 'mcq', order: 2, text: 'Which of the following is a key metric used in email marketing?', optionA: 'Bounce Rate only', optionB: 'Open Rate and Click-Through Rate', optionC: 'Page Views', optionD: 'Domain Authority', correct: 'B', marks: 1 },
  { id: 'q003', courseId: 'c001', type: 'mcq', order: 3, text: 'What is a "conversion" in digital marketing?', optionA: 'Changing your website design', optionB: 'A visitor completing a desired action', optionC: 'Converting currency for ad spend', optionD: 'Switching social media platforms', correct: 'B', marks: 1 },
  { id: 'q004', courseId: 'c001', type: 'mcq', order: 4, text: 'Which social media platform is best suited for B2B marketing?', optionA: 'TikTok', optionB: 'Instagram', optionC: 'LinkedIn', optionD: 'Pinterest', correct: 'C', marks: 1 },
  { id: 'q005', courseId: 'c001', type: 'mcq', order: 5, text: 'What does CPC stand for in digital advertising?', optionA: 'Cost Per Customer', optionB: 'Content Per Click', optionC: 'Cost Per Click', optionD: 'Conversion Per Campaign', correct: 'C', marks: 1 },
  { id: 'q006', courseId: 'c001', type: 'mcq', order: 6, text: 'Which of the following best describes a "landing page"?', optionA: 'The homepage of a website', optionB: 'A dedicated page designed to capture leads or drive conversions', optionC: 'The footer page of a website', optionD: 'An error page', correct: 'B', marks: 1 },
  { id: 'q007', courseId: 'c001', type: 'mcq', order: 7, text: 'What is the primary purpose of Google Analytics?', optionA: 'To run paid advertising campaigns', optionB: 'To track and analyze website traffic and user behavior', optionC: 'To design website layouts', optionD: 'To manage social media posts', correct: 'B', marks: 1 },
  { id: 'q008', courseId: 'c001', type: 'mcq', order: 8, text: 'What is "content marketing"?', optionA: 'Paying for advertisements', optionB: 'Creating and distributing valuable content to attract and retain an audience', optionC: 'Managing website server content', optionD: 'Editing product descriptions', correct: 'B', marks: 1 },
  { id: 'q009', courseId: 'c001', type: 'mcq', order: 9, text: 'Which element is most important for on-page SEO?', optionA: 'Number of social media followers', optionB: 'Website color scheme', optionC: 'Title tags and meta descriptions', optionD: 'Website hosting provider', correct: 'C', marks: 1 },
  { id: 'q010', courseId: 'c001', type: 'mcq', order: 10, text: 'What does ROI stand for in marketing?', optionA: 'Rate of Influence', optionB: 'Return on Investment', optionC: 'Revenue of Interest', optionD: 'Reach of Impact', correct: 'B', marks: 1 },
  { id: 'q011', courseId: 'c001', type: 'mcq', order: 11, text: 'Which of the following is an example of paid digital marketing?', optionA: 'Organic social media posts', optionB: 'Blog articles', optionC: 'Google Ads (PPC)', optionD: 'Email newsletters to existing subscribers', correct: 'C', marks: 1 },
  { id: 'q012', courseId: 'c001', type: 'mcq', order: 12, text: 'What is a "buyer persona" in marketing?', optionA: 'A real customer who makes a purchase', optionB: 'A fictional representation of your ideal customer', optionC: 'An animated character for ads', optionD: 'A legal customer profile document', correct: 'B', marks: 1 },
  { id: 'q013', courseId: 'c001', type: 'mcq', order: 13, text: 'What does CTR mean in digital advertising?', optionA: 'Customer Transaction Rate', optionB: 'Content Tracking Ratio', optionC: 'Click-Through Rate', optionD: 'Campaign Traffic Result', correct: 'C', marks: 1 },
  { id: 'q014', courseId: 'c001', type: 'mcq', order: 14, text: 'Which type of marketing involves influencers promoting products?', optionA: 'Email Marketing', optionB: 'Influencer Marketing', optionC: 'Search Marketing', optionD: 'Display Advertising', correct: 'B', marks: 1 },
  { id: 'q015', courseId: 'c001', type: 'mcq', order: 15, text: 'What is "remarketing" in digital advertising?', optionA: 'Launching a new marketing campaign', optionB: 'Marketing to people who have previously visited your website', optionC: 'Editing previous advertisements', optionD: 'Marketing to new audiences only', correct: 'B', marks: 1 },

  // ── True/False Questions (16-25) ──
  { id: 'q016', courseId: 'c001', type: 'tf', order: 16, text: 'Social media marketing can help improve a website\'s organic search rankings.', correct: 'True', marks: 1 },
  { id: 'q017', courseId: 'c001', type: 'tf', order: 17, text: 'A high bounce rate always indicates poor website performance.', correct: 'False', marks: 1 },
  { id: 'q018', courseId: 'c001', type: 'tf', order: 18, text: 'Email marketing has one of the highest ROIs among digital marketing channels.', correct: 'True', marks: 1 },
  { id: 'q019', courseId: 'c001', type: 'tf', order: 19, text: 'PPC advertising guarantees the first position in search engine results.', correct: 'False', marks: 1 },
  { id: 'q020', courseId: 'c001', type: 'tf', order: 20, text: 'Mobile optimization is important for digital marketing success.', correct: 'True', marks: 1 },
  { id: 'q021', courseId: 'c001', type: 'tf', order: 21, text: 'Keyword stuffing is a recommended SEO practice.', correct: 'False', marks: 1 },
  { id: 'q022', courseId: 'c001', type: 'tf', order: 22, text: 'A call-to-action (CTA) is an element that encourages the user to take a specific step.', correct: 'True', marks: 1 },
  { id: 'q023', courseId: 'c001', type: 'tf', order: 23, text: 'All digital marketing channels require paid advertising budgets.', correct: 'False', marks: 1 },
  { id: 'q024', courseId: 'c001', type: 'tf', order: 24, text: 'A/B testing is a method used to compare two versions of a marketing asset.', correct: 'True', marks: 1 },
  { id: 'q025', courseId: 'c001', type: 'tf', order: 25, text: 'Instagram Stories disappear after 48 hours by default.', correct: 'False', marks: 1 },

  // ── Descriptive Questions (26-30) ──
  { id: 'q026', courseId: 'c001', type: 'descriptive', order: 26, text: 'Explain the difference between organic and paid digital marketing. Provide at least two examples of each and discuss when a business should prioritize one over the other.', marks: 5 },
  { id: 'q027', courseId: 'c001', type: 'descriptive', order: 27, text: 'Describe the concept of the "marketing funnel." What are its main stages and how does digital marketing apply at each stage?', marks: 5 },
  { id: 'q028', courseId: 'c001', type: 'descriptive', order: 28, text: 'What is Search Engine Optimization (SEO)? Explain at least four key on-page SEO factors that a digital marketer should focus on to improve a website\'s ranking.', marks: 5 },
  { id: 'q029', courseId: 'c001', type: 'descriptive', order: 29, text: 'You are tasked with creating a social media strategy for a new local bakery business. Outline the key steps you would take, including platform selection, content types, and how you would measure success.', marks: 5 },
  { id: 'q030', courseId: 'c001', type: 'descriptive', order: 30, text: 'What is email marketing and why is it considered one of the most effective digital marketing channels? Describe three best practices for running a successful email marketing campaign.', marks: 5 },
];
