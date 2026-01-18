# MANUAL TESTING CHECKLIST
## SAT Mock Test Platform - Interactive Testing Guide

**Date:** _______________  
**Tester:** _______________  
**Browser:** _______________  
**Device:** _______________

---

## ✅ PRE-TEST SETUP

- [ ] `.env.local` file configured with Firebase credentials
- [ ] Firestore database created and rules deployed
- [ ] Development server running (`npm run dev`)
- [ ] Browser console open (F12) to monitor errors
- [ ] Network tab open to monitor API calls

---

## 🔐 PHASE 1: AUTHENTICATION TESTING

### Test 1.1: Happy Path Sign-In
- [ ] Navigate to `/login`
- [ ] Click "Sign in with Google"
- [ ] OAuth popup opens within 2 seconds
- [ ] Select Google account
- [ ] Authorize application
- [ ] Redirected to `/student` dashboard
- [ ] Check browser console: No errors
- [ ] Check Firestore: User document created with:
  - [ ] `uid` (string, non-empty)
  - [ ] `email` (valid email format)
  - [ ] `displayName` (string)
  - [ ] `photoURL` (string or null)
  - [ ] `role` ("student" or "admin")
  - [ ] `createdAt` (valid Timestamp)
  - [ ] `lastLoginAt` (valid Timestamp)
  - [ ] `currentStreak` (number, >= 0)
  - [ ] `badges` (array)

### Test 1.2: Session Persistence
- [ ] After sign-in, close browser tab
- [ ] Reopen browser and navigate to site
- [ ] User should be automatically logged in
- [ ] No redirect to `/login` page
- [ ] Dashboard loads with user data

### Test 1.3: Sign-Out
- [ ] Click user menu (top right)
- [ ] Click "Sign Out"
- [ ] Redirected to `/login` page
- [ ] Try accessing `/student` → Should redirect to `/login`
- [ ] Sign-in button is clickable

### Test 1.4: Route Protection
- [ ] While logged out, try accessing:
  - [ ] `/student` → Should redirect to `/login`
  - [ ] `/student/test/[id]` → Should redirect to `/login`
  - [ ] `/admin` → Should redirect to `/login`

---

## 📊 PHASE 2: DASHBOARD TESTING

### Test 2.1: Dashboard Load
- [ ] Navigate to `/student` after login
- [ ] Welcome message displays with user name
- [ ] Profile picture displays (or fallback avatar)
- [ ] XP Progress Bar visible
- [ ] Daily Goal Widget visible
- [ ] Stats cards display:
  - [ ] Day Streak
  - [ ] Completed Tests
  - [ ] In Progress Tests
  - [ ] Badges count

### Test 2.2: Today's Mission Card
- [ ] "Today's Mission" card visible
- [ ] Shows streak message (if streak > 0)
- [ ] Shows "Start your practice streak" (if streak = 0)
- [ ] Card has gradient background (indigo → purple → pink)

### Test 2.3: Daily Challenges Widget
- [ ] Daily Challenges widget loads
- [ ] Shows 3 challenges (or loading state)
- [ ] Each challenge shows:
  - [ ] Icon
  - [ ] Title
  - [ ] Description
  - [ ] Progress bar (if not completed)
  - [ ] Rewards (XP, coins, gems)
- [ ] Completed challenges highlighted in green
- [ ] Overall progress bar at top

### Test 2.4: Skill Tree
- [ ] Skill Tree section visible
- [ ] Category filter buttons work (All, Reading, Math, Writing, Strategy)
- [ ] Skills display with correct icons:
  - [ ] 🔒 Locked skills (gray)
  - [ ] 📘 Learning skills (blue)
  - [ ] ⭐ Mastered skills (yellow)
  - [ ] 💎 Legendary skills (purple)
- [ ] Progress bars show mastery percentage
- [ ] Summary stats at bottom (Unlocked, Mastered, Legendary, Need Practice)

### Test 2.5: Available Tests
- [ ] "Available Practice Tests" section visible
- [ ] Test cards display with:
  - [ ] Test title
  - [ ] Test description
  - [ ] Status (New, In Progress, Completed)
  - [ ] Action button (Start/Continue/Retake)
- [ ] Clicking "Start" navigates to test page
- [ ] Clicking "Continue" resumes existing attempt

---

## 📝 PHASE 3: TEST TAKING INTERFACE

### Test 3.1: Test Start
- [ ] Click "Start Test" on a test card
- [ ] Navigate to `/student/test/[id]`
- [ ] Test loads with:
  - [ ] Timer visible and counting down
  - [ ] Question number indicator
  - [ ] Section information
  - [ ] First question displayed
  - [ ] Navigation buttons (Previous, Skip, Next)

### Test 3.2: Answer Selection
- [ ] Click option A → Option A highlighted
- [ ] Click option B → Option B highlighted, A unhighlighted
- [ ] Only one option selectable at a time
- [ ] Answer persists when navigating away and back

### Test 3.3: Navigation
- [ ] Click "Next" → Moves to next question
- [ ] Click "Previous" → Moves to previous question
- [ ] Click "Skip Question" → Question marked as skipped
- [ ] Progress indicator updates (X/10 answered)

### Test 3.4: Review Modal
- [ ] On last question, click "Review Answers"
- [ ] Review modal opens with:
  - [ ] List of all questions
  - [ ] Answered questions (green background)
  - [ ] Unanswered questions (red background, pulsing)
  - [ ] "Edit" button next to each question
  - [ ] "Submit Test" button (disabled if unanswered)
- [ ] Click "Edit" on a question → Modal closes, navigates to that question
- [ ] Change answer → Return to review modal → Answer updated

### Test 3.5: Submit Confirmation
- [ ] Answer all questions
- [ ] Click "Review Answers"
- [ ] Click "Submit Test"
- [ ] Confirmation dialog appears:
  - [ ] "Submit Your Test?" message
  - [ ] "Go Back" button
  - [ ] "Yes, Submit" button
- [ ] Click "Go Back" → Returns to review modal
- [ ] Click "Yes, Submit" → Test submits, redirects to results page

### Test 3.6: Browser Back Button
- [ ] Start a test
- [ ] Answer a few questions
- [ ] Try to navigate away (browser back button or close tab)
- [ ] Warning dialog appears: "You have a test in progress..."
- [ ] Choose to stay → Returns to test
- [ ] Choose to leave → Navigates away (progress should be saved)

### Test 3.7: Timer Expiration
- [ ] Start a test
- [ ] Wait for timer to reach 0 (or manually set timeRemaining to 0)
- [ ] Test automatically submits when timer expires
- [ ] Redirects to results page

### Test 3.8: Auto-Save
- [ ] Start a test
- [ ] Answer a few questions
- [ ] Wait 30 seconds (auto-save interval)
- [ ] Close browser tab
- [ ] Reopen and navigate to same test
- [ ] Test resumes with saved answers

---

## 📈 PHASE 4: RESULTS & SCORING

### Test 4.1: Results Page
- [ ] After submitting test, redirected to `/student/results/[attemptId]`
- [ ] Results page displays:
  - [ ] Large score display (X out of Y)
  - [ ] Percentage score
  - [ ] Performance message (Excellent, Good, etc.)
  - [ ] Circular progress ring
  - [ ] Section breakdown
  - [ ] Topic performance
  - [ ] Skill performance
  - [ ] Recommendations
- [ ] Confetti animation (if score ≥ 80%)

### Test 4.2: Answer Review
- [ ] Scroll through each question in results
- [ ] Correct answers show:
  - [ ] Green checkmark
  - [ ] "✓ Your answer: [option]" in green
  - [ ] Explanation visible
- [ ] Wrong answers show:
  - [ ] Red X
  - [ ] "✗ Your answer: [option]" in red
  - [ ] "Correct answer: [option]" in green
  - [ ] Explanation visible

### Test 4.3: Score Calculation
- [ ] Complete a test with known answers
- [ ] Verify score matches expected:
  - [ ] 10/10 correct → 100%
  - [ ] 8/10 correct → 80%
  - [ ] 5/10 correct → 50%
- [ ] Check Firestore: Score stored correctly in attempt document

---

## 🎮 PHASE 5: GAMIFICATION

### Test 5.1: XP & Leveling
- [ ] Complete a test
- [ ] Check XP increased:
  - [ ] Correct answers award XP
  - [ ] Perfect score bonus XP
  - [ ] Streak bonus XP (if applicable)
- [ ] Check level progression:
  - [ ] XP progress bar updates
  - [ ] Level increases when threshold reached
  - [ ] Level-up animation plays (if implemented)

### Test 5.2: Badge Awards
- [ ] Complete first question → "First Question" badge awarded
- [ ] Complete test with 10/10 → "Perfect Score" badge awarded
- [ ] Complete test in < 10 minutes → "Speed Demon" badge awarded
- [ ] Complete 7 consecutive days → "Week Streak" badge awarded
- [ ] Check Firestore: Badges added to user.badges array
- [ ] Check dashboard: Badge count updates

### Test 5.3: Streak Tracking
- [ ] Complete a test today
- [ ] Check Firestore: `currentStreak` = 1
- [ ] Complete a test tomorrow (same day or next day)
- [ ] Check Firestore: `currentStreak` = 2
- [ ] Skip a day
- [ ] Check Firestore: `currentStreak` resets to 1 (or uses streak freeze if available)

### Test 5.4: Daily Challenges Progress
- [ ] Complete a test
- [ ] Check Daily Challenges widget:
  - [ ] "Perfect Streak" challenge progress updates
  - [ ] "Speed Demon" challenge progress updates (if time < goal)
- [ ] Complete all 3 challenges
- [ ] Challenges marked as completed
- [ ] Rewards awarded (XP, coins, gems)

---

## 🔒 PHASE 6: SECURITY & DATA INTEGRITY

### Test 6.1: API Authorization
- [ ] Open browser DevTools → Network tab
- [ ] Try accessing API without token:
  - [ ] `GET /api/tests/results/user` → Should return 401
  - [ ] `POST /api/tests/[id]/submit` → Should return 401
- [ ] Try accessing admin API as student:
  - [ ] `GET /api/admin/stats` → Should return 403

### Test 6.2: Duplicate Submission Prevention
- [ ] Complete and submit a test
- [ ] Immediately try to submit same test again
- [ ] Second submission should be rejected
- [ ] Error message: "You already completed this test"
- [ ] Check Firestore: Only ONE attempt document exists

### Test 6.3: Score Integrity
- [ ] Open browser DevTools → Console
- [ ] Try to manipulate score in client-side code
- [ ] Submit test
- [ ] Check results: Score should be server-calculated (not client value)
- [ ] Check Firestore: Score matches server calculation

---

## 📱 PHASE 7: RESPONSIVE DESIGN

### Test 7.1: Samsung Galaxy Tab (1280×800)
- [ ] Set browser viewport to 1280×800
- [ ] Test all pages:
  - [ ] Login page
  - [ ] Dashboard
  - [ ] Test taking interface
  - [ ] Results page
- [ ] Verify:
  - [ ] No horizontal scroll
  - [ ] All elements visible
  - [ ] Touch targets ≥ 48px
  - [ ] Text readable (font size ≥ 16px)

### Test 7.2: Mobile (375×667)
- [ ] Set browser viewport to 375×667
- [ ] Test all pages
- [ ] Verify:
  - [ ] Responsive layout
  - [ ] Navigation menu works
  - [ ] Forms usable
  - [ ] Buttons accessible

---

## ⚡ PHASE 8: PERFORMANCE

### Test 8.1: Page Load Speed
- [ ] Open Chrome DevTools → Lighthouse
- [ ] Run performance audit on:
  - [ ] Login page
  - [ ] Dashboard
  - [ ] Test taking page
- [ ] Verify:
  - [ ] First Contentful Paint < 1.5s
  - [ ] Largest Contentful Paint < 2.5s
  - [ ] Time to Interactive < 3.5s
  - [ ] Performance score > 90

### Test 8.2: Firestore Reads
- [ ] Open browser DevTools → Network tab
- [ ] Filter by "firestore.googleapis.com"
- [ ] Navigate to dashboard
- [ ] Count Firestore reads (should be ≤ 5)
- [ ] Navigate to test page
- [ ] Count Firestore reads (should be ≤ 2)

---

## ♿ PHASE 9: ACCESSIBILITY

### Test 9.1: Keyboard Navigation
- [ ] Tab through login page
- [ ] All elements focusable
- [ ] Focus indicators visible
- [ ] Enter key submits form
- [ ] Tab through test taking interface
- [ ] Space key selects answer options

### Test 9.2: Screen Reader
- [ ] Enable screen reader (NVDA/VoiceOver)
- [ ] Navigate through pages
- [ ] Verify:
  - [ ] Buttons announced correctly
  - [ ] Question text read aloud
  - [ ] Selected option confirmed
  - [ ] Progress updates announced

---

## 🐛 BUG REPORTING

If you find any issues, document them:

**Bug #X: [Brief description]**
- **Location:** [File:Line or Page/Component]
- **Severity:** Critical / High / Medium / Low
- **Steps to Reproduce:**
  1. [Step]
  2. [Step]
  3. [Step]
- **Expected:** [What should happen]
- **Actual:** [What actually happens]
- **Screenshots:** [If applicable]
- **Console Errors:** [If any]

---

## ✅ FINAL CHECKLIST

- [ ] All critical tests passed
- [ ] No console errors
- [ ] No Firestore permission errors
- [ ] All API routes respond correctly
- [ ] Data persists correctly
- [ ] UI is responsive
- [ ] Performance metrics acceptable
- [ ] Accessibility features work

---

**Testing Complete Date:** _______________  
**Overall Status:** ✅ PASS / ❌ FAIL  
**Notes:** _______________
