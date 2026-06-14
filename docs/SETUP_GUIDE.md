# Everium Test Platform — Complete Setup Guide

**Written for non-technical users. No coding experience required.**
Estimated time: 20–30 minutes.

---

## Overview

You will do 4 things, in this order:

1. Create a Google Sheet (your database)
2. Add the backend code (Google Apps Script) and deploy it
3. Connect your website to the backend (one line edit)
4. Publish your website on GitHub Pages (free hosting)

---

## PART 1 — Create Your Google Sheet (Database)

1. Go to [sheets.google.com](https://sheets.google.com) and sign in with your Google account.
2. Click **Blank** to create a new spreadsheet.
3. Rename it to **Everium Test Platform DB** (click the title at the top-left and type the new name).
4. That's it for now — you don't need to create any tabs or columns manually. The setup script (next part) will do this automatically.

---

## PART 2 — Add the Backend Code (Google Apps Script)

1. In your new Google Sheet, click **Extensions** in the top menu, then **Apps Script**.
2. A new tab opens with a code editor. You'll see a file called `Code.gs` with some default text like `function myFunction() {}`.
3. **Delete all the existing text** in that editor (select all with Ctrl+A / Cmd+A, then Delete).
4. Open the `Code.gs` file from this project (in the folder you downloaded) using any text editor (Notepad, TextEdit, VS Code).
5. **Copy the entire contents** of that file.
6. **Paste it** into the Apps Script editor (replacing the empty space).
7. Click the **Save** icon (looks like a floppy disk) or press Ctrl+S / Cmd+S.

### Run the Setup Function (creates your database structure + default accounts)

8. At the top of the Apps Script editor, you'll see a dropdown that says "Select function". Click it and choose **`setupSheets`**.
9. Click the **Run** button (▶ icon).
10. The first time you run this, Google will ask for permission:
    - Click **Review Permissions**
    - Choose your Google account
    - You may see a warning "Google hasn't verified this app" — this is normal for personal scripts. Click **Advanced**, then **Go to [Your Project Name] (unsafe)**.
    - Click **Allow**.
11. Wait a few seconds. You should see a small notification "Setup complete" appear at the bottom of your Google Sheet (switch back to the Sheet tab to see it).
12. Go back to your Google Sheet — you should now see 6 tabs at the bottom: **Users, Courses, Questions, Attempts, Responses, Sessions**, all pre-filled with default data including your admin/teacher/student accounts and 30 exam questions.

---

## PART 3 — Deploy the Backend as a Web App

This makes your Google Sheet accessible to your website.

1. Back in the Apps Script editor, click the blue **Deploy** button (top-right), then **New deployment**.
2. Click the gear/settings icon ⚙️ next to "Select type" and choose **Web app**.
3. Fill in the fields:
   - **Description**: `Everium API v1` (or anything you like)
   - **Execute as**: `Me (your email)`
   - **Who has access**: `Anyone`

   > ⚠️ "Anyone" is required so your website (running in users' browsers) can talk to the script. Your data is still only accessible through the specific functions defined in the code — there's no general file access.

4. Click **Deploy**.
5. You'll be asked to authorize again — repeat the same steps as in Part 2 (Review Permissions → Advanced → Go to project → Allow).
6. After deployment, you'll see a **Web app URL** that looks like:
   ```
   https://script.google.com/macros/s/AKfycby.../exec
   ```
7. **Copy this URL** — you'll need it in the next step. Keep this tab open or save the URL somewhere safe.

### If you ever update the Code.gs file later:
- Go to **Deploy** → **Manage deployments**
- Click the pencil/edit icon on your existing deployment
- Change **Version** to "New version"
- Click **Deploy**
- (The URL stays the same — no need to update your website again)

---

## PART 4 — Connect Your Website to the Backend

1. Open the project folder you downloaded.
2. Open `js/config.js` in a text editor (Notepad, TextEdit, etc.)
3. Find this line near the top:
   ```javascript
   API_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID_HERE/exec',
   ```
4. Replace `https://script.google.com/macros/s/YOUR_SCRIPT_ID_HERE/exec` with the Web App URL you copied in Part 3. Keep the quotes around it.
5. Find this line a bit further down:
   ```javascript
   DEMO_MODE: true,
   ```
6. Change `true` to `false`:
   ```javascript
   DEMO_MODE: false,
   ```
7. Save the file.

---

## PART 5 — Publish on GitHub Pages (Free Hosting)

See `docs/DEPLOYMENT_GUIDE.md` for the complete step-by-step guide to publishing your website for free using GitHub Pages.

---

## ✅ Verify Everything Works

1. Open your published website (or open `index.html` locally in a browser for a quick check).
2. Log in with:
   - Username: `admin01`
   - Password: `Admin@123`
3. Go to **Users** — you should see all 13 default accounts (1 admin, 2 teachers, 10 students).
4. Go to **Questions** — you should see 30 questions (15 MCQ, 10 True/False, 5 Descriptive).
5. Log out and log in as `student01` / `Student@123`, start the test, answer a few questions, and refresh the page — your answers and timer should be preserved.
6. Log back in as admin and check **Results** — you won't see anything until a student submits.

---

## 🔒 IMPORTANT: Change Default Passwords

Once everything works:

1. Log in as `admin01`.
2. Go to **Users**.
3. Click **Edit** next to each account.
4. Enter a new password and save.

Do this for at least the admin account immediately — the default credentials are publicly documented in this guide.

---

## ❓ Troubleshooting

**"Connection error" when logging in:**
- Double-check the `API_URL` in `js/config.js` is correct and ends with `/exec`.
- Make sure `DEMO_MODE` is set to `false`.
- Confirm the Apps Script deployment's "Who has access" is set to "Anyone".

**Changes to Code.gs aren't showing up:**
- You need to create a **new version** of your deployment (see Part 3 notes above) — saving alone is not enough.

**"Operation not permitted" message when editing admin accounts:**
- This is intentional — the system always keeps at least one active admin account, as required.

**Login works but data doesn't save (timer resets, answers disappear):**
- Check that all 6 sheet tabs exist with the correct names (case-sensitive: `Users`, `Courses`, `Questions`, `Attempts`, `Responses`, `Sessions`).
- Re-run `setupSheets` if any tabs are missing (this won't duplicate existing data incorrectly if tabs already exist with data — but to be safe, only run it on a fresh sheet).
