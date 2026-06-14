# Deployment Guide — GitHub Pages

**Publish your Everium Test Platform website for free in 10 minutes.**

---

## Prerequisites

- A free [GitHub](https://github.com) account (sign up if you don't have one).
- Your project folder, with `js/config.js` already updated (see `SETUP_GUIDE.md` Part 4).

---

## Step 1 — Create a New Repository

1. Log in to [github.com](https://github.com).
2. Click the **+** icon (top-right) → **New repository**.
3. Repository name: `everium-test-platform` (or any name you like — this becomes part of your website URL).
4. Set visibility to **Public** (required for free GitHub Pages).
5. Do **not** check "Add a README file" (we already have one).
6. Click **Create repository**.

---

## Step 2 — Upload Your Project Files

### Option A: Using GitHub's Web Interface (Easiest)

1. On your new repository page, click **uploading an existing file** (or "Add file" → "Upload files").
2. Open your project folder on your computer.
3. **Drag and drop ALL files and folders** into the GitHub upload area:
   - `index.html`
   - `css/` folder
   - `js/` folder
   - `Code.gs`
   - `README.md`
   - `docs/` folder
4. Scroll down, add a commit message like "Initial upload", and click **Commit changes**.

> **Tip:** If drag-and-drop of folders doesn't work in your browser, upload files one-by-one — GitHub will recreate the folder structure automatically based on file paths if you select multiple files from a folder at once. Alternatively, use GitHub Desktop (Option B).

### Option B: Using GitHub Desktop (Recommended for larger projects)

1. Download and install [GitHub Desktop](https://desktop.github.com/).
2. Sign in with your GitHub account.
3. Click **File** → **Clone Repository**, select the repository you created.
4. Choose a location on your computer to save it.
5. Copy all your project files into that cloned folder (replacing/merging as needed).
6. In GitHub Desktop, you'll see all the new files listed as changes.
7. Add a commit message ("Initial upload") and click **Commit to main**.
8. Click **Push origin** to upload everything to GitHub.

---

## Step 3 — Enable GitHub Pages

1. On your repository page, click **Settings** (top menu).
2. In the left sidebar, click **Pages**.
3. Under **Build and deployment**:
   - **Source**: `Deploy from a branch`
   - **Branch**: select `main` (or `master`) and folder `/ (root)`
4. Click **Save**.
5. Wait 1–2 minutes. Refresh the page — you'll see a message like:
   > Your site is live at `https://yourusername.github.io/everium-test-platform/`

---

## Step 4 — Visit Your Live Site

1. Open the URL shown (e.g., `https://yourusername.github.io/everium-test-platform/`).
2. You should see the **Everium Test Platform** login page.
3. Log in with `admin01` / `Admin@123` to verify everything is connected.

---

## Updating Your Site Later

Whenever you make changes to any file (HTML, CSS, JS):

- **Web interface**: Go to the file on GitHub, click the pencil (✏️) icon to edit, make changes, and click "Commit changes".
- **GitHub Desktop**: Edit files locally, then Commit and Push again.

GitHub Pages automatically redeploys within 1–2 minutes after any change.

---

## Custom Domain (Optional)

If you own a domain name (e.g., `exams.yourcoaching.com`):

1. In repository **Settings** → **Pages**, enter your domain under "Custom domain".
2. Add a `CNAME` record at your domain registrar pointing to `yourusername.github.io`.
3. This step is optional — your site works perfectly fine on the free `github.io` URL.

---

## Important Notes on Free Hosting Limits

GitHub Pages free tier includes:
- 1 GB storage
- 100 GB bandwidth/month
- Unlimited public repositories

This is more than sufficient for a coaching centre's examination platform. Google Apps Script free tier includes generous daily quotas (20,000+ requests/day) — more than enough for typical coaching centre usage (dozens to a few hundred students).

---

## Security Checklist Before Going Live

- [ ] `DEMO_MODE` is set to `false` in `js/config.js`
- [ ] `API_URL` points to your deployed Apps Script Web App
- [ ] Default passwords have been changed (especially `admin01`)
- [ ] Your repository is set to **Public** (required for free GitHub Pages) — avoid putting any sensitive business data in the repo files themselves (all sensitive data lives in your private Google Sheet, not in the code)
- [ ] Apps Script deployment access is set to "Anyone" (required for the API to work) but "Execute as: Me" (so only your script logic runs, not arbitrary code)
