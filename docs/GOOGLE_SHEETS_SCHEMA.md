# Google Sheets Database Schema

This document describes every sheet (tab) and column used by Everium Test Platform.
**You do not need to create these manually** — running `setupSheets()` in Apps Script (see `SETUP_GUIDE.md`) creates everything automatically. This reference is for understanding or troubleshooting your data.

---

## 1. `Users` Sheet

Stores all login accounts (Admin, Teacher, Student).

| Column | Type | Description |
|---|---|---|
| `id` | Text | Unique user ID (e.g., `u_a1b2c3d4`) |
| `username` | Text | Login username (must be unique) |
| `passwordHash` | Text | SHA-256 hash of the password (never plain text) |
| `name` | Text | Full display name |
| `role` | Text | One of: `admin`, `teacher`, `student` |
| `email` | Text | Optional email address |
| `active` | Boolean | `TRUE` = can log in, `FALSE` = disabled |
| `createdAt` | DateTime | Account creation timestamp (ISO format) |

**Default rows:** 1 admin, 2 teachers, 10 students (13 total).

---

## 2. `Courses` Sheet

Stores available courses/exams.

| Column | Type | Description |
|---|---|---|
| `id` | Text | Unique course ID (e.g., `c_a1b2c3d4`) |
| `code` | Text | Short course code (e.g., `DMF101`) |
| `name` | Text | Full course name |
| `description` | Text | Course description shown to students |
| `duration` | Number | Exam duration in minutes (default: 45) |
| `totalQuestions` | Number | Total questions in the exam (default: 30) |
| `active` | Boolean | `TRUE` = visible to students |
| `createdAt` | DateTime | Creation timestamp |

**Default rows:** 1 course — "Digital Marketing Fundamentals".

### Adding a New Course

To add another course later:
1. Open the `Courses` sheet.
2. Add a new row with a unique `id` (e.g., `c_course2`), fill in all columns, set `active` to `TRUE`.
3. Add corresponding questions in the `Questions` sheet with matching `courseId`.

---

## 3. `Questions` Sheet

Stores all exam questions across all courses.

| Column | Type | Description |
|---|---|---|
| `id` | Text | Unique question ID |
| `courseId` | Text | Links to `Courses.id` |
| `type` | Text | One of: `mcq`, `tf`, `descriptive` |
| `order` | Number | Display order within the exam (1–30) |
| `text` | Text | The question text |
| `optionA` | Text | MCQ Option A (blank for tf/descriptive) |
| `optionB` | Text | MCQ Option B |
| `optionC` | Text | MCQ Option C |
| `optionD` | Text | MCQ Option D |
| `correct` | Text | Correct answer: `A`/`B`/`C`/`D` for MCQ, `True`/`False` for T/F, blank for descriptive |
| `marks` | Number | Marks awarded for this question (MCQ/TF = 1, Descriptive = 5) |

**Default rows:** 30 (15 MCQ + 10 True/False + 5 Descriptive) for the Digital Marketing Fundamentals course.

---

## 4. `Attempts` Sheet

Tracks each student's exam attempt — one row per student per course.

| Column | Type | Description |
|---|---|---|
| `id` | Text | Unique attempt ID |
| `userId` | Text | Links to `Users.id` |
| `courseId` | Text | Links to `Courses.id` |
| `status` | Text | `active` (in progress) or `completed` |
| `startTime` | DateTime | When the student clicked "Start Test" |
| `endTime` | DateTime | When the student submitted (blank if active) |
| `remainingSeconds` | Number | Seconds left on the timer (synced periodically) |
| `score` | Number | Total auto-graded score (MCQ + TF), blank until submitted |
| `mcqScore` | Number | Score from MCQ section (out of 15) |
| `tfScore` | Number | Score from True/False section (out of 10) |
| `lastSyncAt` | DateTime | Last time the timer was synced from the browser |

**How the single-attempt rule works:**
- A new row is created only when a student clicks "Start Test" for the first time.
- If a row already exists for that `userId` + `courseId`, the student cannot start a new attempt.
- Only the Admin's "Reset Attempt" action deletes this row (and related `Responses` rows), allowing one new attempt.

**How cross-device timer continuity works:**
- `remainingSeconds` is calculated live on the server as: `45 minutes − (current time − startTime)`.
- This means even if the browser is closed, refreshed, or switched, the correct remaining time is always recalculated from the original `startTime` — it cannot be manipulated by clearing cache or changing devices.

---

## 5. `Responses` Sheet

Stores every individual answer a student submits.

| Column | Type | Description |
|---|---|---|
| `id` | Text | Unique response ID |
| `attemptId` | Text | Links to `Attempts.id` |
| `questionId` | Text | Links to `Questions.id` |
| `answer` | Text | The student's answer (option letter, True/False, or descriptive text) |
| `savedAt` | DateTime | Timestamp of the most recent save |

**How auto-save works:**
- Every time a student selects an MCQ/TF option, a row is created/updated immediately.
- For descriptive answers, saves are debounced (1 second after typing stops) to avoid excessive requests.
- On final submission, all answers are written/confirmed in one batch.

---

## 6. `Sessions` Sheet

Lightweight login activity log (informational; not used for security enforcement beyond basic tracking).

| Column | Type | Description |
|---|---|---|
| `id` | Text | Unique session ID |
| `userId` | Text | Links to `Users.id` |
| `token` | Text | Session token issued at login |
| `loginAt` | DateTime | Login timestamp |
| `lastActiveAt` | DateTime | Last activity timestamp |

---

## Data Relationships Diagram

```
Users (1) ──────────────┐
  │                       │
  │ userId                │ userId
  ▼                       ▼
Attempts ◄──courseId───── Courses
  │                          │
  │ attemptId                │ courseId
  ▼                          ▼
Responses ──questionId──► Questions
```

---

## Manual Data Editing Tips

- **Never edit `passwordHash` directly** — use the Admin → Users panel, which hashes passwords correctly. Manually typing a password into this column will break login for that account.
- **`active` column must contain `TRUE`/`FALSE`** (Google Sheets boolean), not text "true"/"false".
- If you accidentally delete a header row, re-run the relevant `setupXSheet()` function from Apps Script (e.g., `setupUsersSheet()`) — **warning: this clears existing data in that sheet**, so only do this on an empty/broken sheet.
