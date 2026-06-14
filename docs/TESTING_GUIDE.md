# Testing Guide

Use this checklist to verify every feature works correctly after deployment.

---

## 1. Authentication & Access Control

| Test | Steps | Expected Result |
|---|---|---|
| Valid login | Log in as `admin01` / `Admin@123` | Redirects to Admin Dashboard |
| Invalid password | Log in with wrong password | Shows "Invalid username or password" |
| Disabled account | Disable a student via Admin → Users, then try logging in as that student | Shows "This account has been disabled" |
| Role isolation | Log in as a student, confirm no admin/teacher menus appear | Only Student Dashboard is accessible |
| Session persistence | Log in, refresh the page | Stays logged in, redirected to correct dashboard |
| Logout | Click "Sign Out" | Returns to login page, session cleared |

---

## 2. Admin — User Management

| Test | Steps | Expected Result |
|---|---|---|
| Create student | Admin → Users → Add User → fill form, role = Student | New student appears in table, can log in |
| Create teacher | Same as above, role = Teacher | New teacher appears, can access Teacher dashboard |
| Edit user | Click Edit on any user, change name/username | Changes reflected immediately |
| Change password | Edit user, enter new password, save | User can log in with new password only |
| Disable user | Click "Disable" on a student | Status badge changes to "Disabled"; that student cannot log in |
| Enable user | Click "Enable" on a disabled student | Status badge changes to "Active"; login works again |
| Delete user | Click "Delete" on a student, confirm | User removed from table and database |
| **Last admin protection — delete** | Try to delete the only active admin account | Blocked with message: "Operation not permitted. The system must always have at least one active Admin account." |
| **Last admin protection — disable** | Try to disable the only active admin account | Same blocking message |
| **Last admin protection — demote** | Edit the only active admin, change role to Student | Same blocking message |
| Multiple admins | Create a 2nd admin, then disable/delete the 1st | Should succeed, since one admin remains active |
| Search | Type a name/username into the search box | Table filters in real time |
| Role filter | Click "Students" / "Teachers" / "Admins" tabs | Table shows only matching role |

---

## 3. Admin — Question Management

| Test | Steps | Expected Result |
|---|---|---|
| View questions | Admin → Questions | Shows 15 MCQ, 10 T/F, 5 Descriptive (30 total) |
| Add MCQ | Click "Add Question", type = MCQ, fill all fields + correct answer | New question appears in MCQ tab |
| Add T/F | Type = True/False, fill question + correct answer | New question appears in T/F tab |
| Add Descriptive | Type = Descriptive, fill question text only | New question appears in Descriptive tab |
| Edit question | Click Edit on any question, change text | Updated text shown immediately |
| Delete question | Click Delete, confirm | Question removed from list and count updates |
| Validation | Try saving an MCQ with an empty option | Shows error: "All four MCQ options are required" |

---

## 4. Student — Exam Flow

| Test | Steps | Expected Result |
|---|---|---|
| Course selection | Log in as `student01`, click "Start Test" | Course selection page shows "Digital Marketing Fundamentals" |
| Start exam | Select course, click "Start Test" | Timer starts at 45:00, Question 1 of 30 shown |
| MCQ answer | Click any option | Option highlights, progress bar updates, nav grid marks question as answered |
| T/F answer | Navigate to a True/False question, click True or False | Selection highlights |
| Descriptive answer | Navigate to a descriptive question, type text | Character count updates; "✓ Saved" indicator briefly appears |
| Navigation | Use Previous/Next buttons and the question number grid | Moves between questions correctly, preserving answers |
| Progress bar | Answer several questions | Progress bar and "X of 30 answered" update accordingly |

---

## 5. Timer Persistence (Critical Tests)

| Test | Steps | Expected Result |
|---|---|---|
| Refresh during exam | Start exam, answer a few questions, refresh browser | Returns to same question/answers; timer continues from where it was (NOT reset to 45:00) |
| Cross-device resume | Start exam on Device A, answer questions, log out. Log in on Device B | All answers restored; timer shows correct remaining time (accounts for elapsed time, not paused) |
| Timer expiry | (Optional — for testing, you can temporarily reduce `EXAM_DURATION_SECONDS` in `Code.gs` to 60 seconds, redeploy) Let timer reach 0:00 | Exam auto-submits; redirected to Completion page |
| Warning states | Watch timer approach 5:00 and 1:00 remaining | Timer color changes (amber at 5 min, red + pulsing at 1 min); toast notifications appear |

---

## 6. Single Attempt Enforcement

| Test | Steps | Expected Result |
|---|---|---|
| One attempt only | Complete an exam as `student02`. Log out, log back in, try to start again | Shows "You have already completed this assessment" / completion notice on dashboard |
| Resume active attempt | Start exam as `student03`, close browser without submitting. Log back in | "Resume Test" button appears; clicking it restores the in-progress exam |
| Admin reset | As Admin, go to Users → find `student02` → click "Reset Attempt" | Confirmation shown; `student02` can now start a fresh attempt with no prior answers |

---

## 7. Submission & Completion

| Test | Steps | Expected Result |
|---|---|---|
| Manual submit | Answer all/some questions, click "Submit Test" on the last question | Confirmation modal appears |
| Confirm submission | Click "Yes, Submit" | Redirects to Completion page with the exact required message |
| No score shown | Review Completion page content | Confirms NO score, percentage, or answer key is shown to student |
| Post-submit lock | Try navigating back or refreshing | Student remains on Completion page / cannot restart exam |

---

## 8. Teacher Dashboard

| Test | Steps | Expected Result |
|---|---|---|
| Login | Log in as `teacher01` / `Teacher@123` | Redirects to Teacher Dashboard |
| View results | Check the submissions table | Shows all completed attempts with MCQ/TF scores |
| View descriptive answers | Click "View Answers" on a submission | Modal shows all 5 descriptive responses for that student |
| No management access | Confirm no "Users" or "Questions" menu items exist | Teacher cannot create/edit/delete users or questions |
| Stats cards | Check "In Progress", "Completed", "Total Students", "Average Score" | Numbers match actual data |

---

## 9. Admin — Results & Analytics

| Test | Steps | Expected Result |
|---|---|---|
| Results table | Admin → Results | Shows all completed attempts across all students |
| Export CSV | Click "Export CSV" | Downloads a `.csv` file with student names, scores, and timestamps |
| Analytics view | Admin → Analytics | Shows progress bars: Completed / In Progress / Not Started percentages |

---

## 10. Responsive Design

| Test | Steps | Expected Result |
|---|---|---|
| Mobile (375px width) | Open site on a phone or use browser dev tools mobile view | Sidebar collapses to hamburger menu; exam questions are fully readable; buttons are tappable |
| Tablet (768px) | Resize browser to tablet width | Stats cards reflow to 2 columns; layout remains clean |
| Desktop | Full-width browser | Sidebar always visible; multi-column stat cards |

---

## 11. Data Sync Verification (Google Sheets)

After running through the tests above, open your Google Sheet directly and verify:

- **`Users`** — new/edited/deleted users reflect correctly; `active` column toggles as TRUE/FALSE
- **`Attempts`** — one row per student attempt; `status` changes from `active` to `completed`; `remainingSeconds` updates periodically while exam is active
- **`Responses`** — one row per question answered, with `answer` and `savedAt` updating live
- **`Questions`** — additions/edits/deletions from Admin panel reflect in the sheet rows

---

## Known Limitations (By Design)

- Students cannot view their own results/scores — this is intentional per requirements.
- Only one course is pre-loaded; additional courses require adding rows to `Courses` and `Questions` sheets (see `GOOGLE_SHEETS_SCHEMA.md`).
- Descriptive questions are not auto-graded — Admin/Teacher review manually via the Results panel.
