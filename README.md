# Everium Test Platform

**A premium, fully free online examination platform for coaching centres.**

Built with HTML, CSS, JavaScript, Google Sheets, and Google Apps Script — hosted entirely on GitHub Pages at **zero cost**.

---

## 📋 What's Included

| Folder / File | Purpose |
|---|---|
| `index.html` | The entire application (all pages) |
| `css/style.css` | Premium design system & animations |
| `js/config.js` | Configuration — **set your API URL here** |
| `js/api.js` | Communication with Google Apps Script |
| `js/auth.js` | Login/session management |
| `js/ui.js` | Toasts, modals, helpers |
| `js/app.js` | Page routing, dashboards |
| `js/exam.js` | Timer, exam engine, auto-save |
| `js/users.js` | Admin user management |
| `js/questions.js` | Admin question bank management |
| `Code.gs` | **Google Apps Script backend** — paste into Apps Script |
| `docs/SETUP_GUIDE.md` | Step-by-step setup (beginner friendly) |
| `docs/GOOGLE_SHEETS_SCHEMA.md` | Full database schema |
| `docs/DEPLOYMENT_GUIDE.md` | GitHub Pages deployment |
| `docs/TESTING_GUIDE.md` | How to test every feature |
| `docs/USER_MANUAL.md` | How to use the platform (Admin/Teacher/Student) |

---

## 🚀 Quick Start (3 Steps)

1. **Google Sheets + Apps Script** → Follow `docs/SETUP_GUIDE.md` to create your database and backend (takes ~15 minutes, no coding required).
2. **Update Config** → Paste your Apps Script Web App URL into `js/config.js` (one line) and set `DEMO_MODE = false`.
3. **GitHub Pages** → Follow `docs/DEPLOYMENT_GUIDE.md` to publish your site for free.

---

## 🔑 Default Login Accounts

| Role | Username | Password |
|---|---|---|
| Admin | `admin01` | `Admin@123` |
| Teacher | `teacher01` | `Teacher@123` |
| Teacher | `teacher02` | `Teacher@123` |
| Student | `student01` – `student10` | `Student@123` |

⚠️ **Change all default passwords immediately after setup** using the Admin → Users panel.

---

## ✨ Features

- **Role-based access** — Admin, Teacher, Student with strict permission boundaries
- **Single-attempt exams** — 45-minute timer, persists across devices/refreshes
- **30-question exam** — 15 MCQ + 10 True/False (auto-scored) + 5 Descriptive (manual review)
- **Cross-device resume** — start on phone, continue on laptop
- **Auto-save** — every answer syncs to Google Sheets instantly
- **Admin protections** — system always keeps at least one active admin
- **Premium UI** — Navy/Royal Blue/Gold theme with smooth animations
- **Fully responsive** — mobile, tablet, laptop, desktop

---

## 🎨 Try It First (Demo Mode)

The app ships with `DEMO_MODE: true` in `js/config.js`, which runs entirely in-browser using sample data — no setup required. Open `index.html` in a browser to explore the UI before connecting Google Sheets.

**Note:** In demo mode, data resets on page reload. Switch to live mode for persistent storage.

---

## 🆘 Need Help?

See `docs/SETUP_GUIDE.md` for a complete walkthrough written for non-technical users.
