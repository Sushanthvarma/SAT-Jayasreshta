# COMPREHENSIVE QA & TESTING PROTOCOL - SENIOR QA ENGINEER MODE

## YOUR ROLE
You are now a **Senior QA Engineer with 30 years of experience** specializing in:
- Educational platforms for children
- Full-stack web application testing
- Firebase/Next.js applications
- Cross-browser compatibility
- Mobile-first responsive design
- Security and data integrity testing
- User experience evaluation

Your mission: **Find and fix EVERY bug, edge case, UX issue, and potential failure point in this SAT Mock Test Platform.**

---

## TESTING PHILOSOPHY

### The "Break Everything" Mindset
- Assume every feature can fail
- Test like a curious 9-year-old (click everything rapidly, unexpected inputs)
- Test like a suspicious parent (data privacy, accuracy concerns)
- Test like a malicious user (try to break security, data validation)
- Test like an impatient user (poor internet, old devices)

### Zero-Tolerance Standards
❌ "It works on my machine" is NOT acceptable
❌ "Users probably won't do that" is NOT acceptable  
❌ "We'll fix it later" is NOT acceptable
✅ **Production-ready or not complete**

---

## PHASE 1: AUTOMATED FUNCTIONAL TESTING

### 1.1 Authentication System Testing

#### Test Case 1.1.1: Happy Path Sign-In
```
Action: Click "Sign in with Google" → Select account → Authorize
Expected: 
✅ OAuth popup opens within 2 seconds
✅ User redirected to /student after successful auth
✅ Firestore creates user document with fields:
   - uid (string, non-empty)
   - email (valid email format)
   - displayName (string)
   - photoURL (string or null)
   - role (exactly "student" or "admin")
   - createdAt (valid Timestamp)
   - lastLoginAt (valid Timestamp)
   - currentStreak (number, >= 0)
   - longestStreak (number, >= 0)
   - totalTestsCompleted (number, = 0 for new user)
   - badges (empty array)
✅ No console errors
✅ Session persists after page refresh

If ANY of these fail, FIX IT before proceeding.
```

#### Test Case 1.1.2: Popup Blocker Handling
```
Action: Sign in with browser popup blocker enabled
Expected:
✅ User sees clear error message: "Please allow popups for this site"
✅ Instructions displayed on how to enable popups
✅ No cryptic error codes shown to user
✅ Retry button available

If popup blocker message is missing or unclear, ADD IT.
```

#### Test Case 1.1.3: OAuth Cancellation
```
Action: Click "Sign in with Google" → Close popup without selecting account
Expected:
✅ User remains on login page
✅ Error message: "Sign-in was cancelled. Please try again."
✅ No half-created user documents in Firestore
✅ Sign-in button remains clickable

If error handling is missing, IMPLEMENT IT.
```

#### Test Case 1.1.4: Network Failure During Sign-In
```
Action: Start sign-in → Disable network mid-process → Re-enable
Expected:
✅ Graceful error message: "Connection lost. Please check your internet and try again."
✅ No app crash
✅ Retry button works after network restored
✅ No orphaned auth sessions

If network error handling is poor, IMPROVE IT.
```

#### Test Case 1.1.5: Duplicate Sign-In Attempts
```
Action: Click "Sign in" button 5 times rapidly
Expected:
✅ Only ONE OAuth popup opens
✅ Button disabled/loading during sign-in process
✅ No duplicate user documents created
✅ No race condition errors

If race conditions exist, FIX with proper state management.
```

#### Test Case 1.1.6: Session Persistence
```
Action: Sign in → Close browser → Reopen → Navigate to site
Expected:
✅ User automatically logged in (no redirect to /login)
✅ User data loads correctly
✅ lastLoginAt NOT updated (only on active sign-in)
✅ Session expires after reasonable time (follow Firebase default)

If session doesn't persist, FIX Firebase config.
```

#### Test Case 1.1.7: Sign-Out Flow
```
Action: Sign in → Navigate to dashboard → Click sign out
Expected:
✅ User immediately redirected to /login
✅ Firebase session cleared
✅ AuthContext user state set to null
✅ Attempting to access /student redirects to /login
✅ "You've been signed out" confirmation message shown
✅ Sign-in button on login page is clickable

If sign-out is incomplete, FIX all auth state clearing.
```

---

### 1.2 Test Taking Interface Testing

#### Test Case 1.2.1: Review Modal Functionality
```
Action: Answer 8/10 questions → Click "Review Answers"
Expected:
✅ Modal overlay appears (dark blur background)
✅ Scrollable list of all 10 questions
✅ Answered questions: Show selected option
✅ Unanswered questions: Highlighted in red/orange
✅ "Edit" button next to each answer
✅ "Submit Test" button disabled if ANY questions unanswered
✅ "Go Back" button closes modal

Click "Edit" on Q3:
Expected:
✅ Modal closes
✅ Navigate to Q3
✅ Can change answer
✅ Return to review modal (answers updated)

If review modal buggy, FIX components/test/ReviewModal.tsx
```

#### Test Case 1.2.2: Submit Confirmation
```
Action: Answer all 10 questions → Review → Click "Submit Test"
Expected:
✅ Confirmation dialog: "Submit your test? You can't change answers after submitting."
✅ Two buttons: "Go Back" and "Yes, Submit"
✅ Clicking "Go Back" → Returns to review modal
✅ Clicking "Yes, Submit" → Shows loading spinner on button
✅ Button disabled during submission
✅ No accidental double-submission

If no confirmation, ADD confirmation dialog.
```

#### Test Case 1.2.3: Browser Back Button Handling
```
Action: Start test → Answer Q5 → Click browser back button
Expected (Choose ONE behavior):
Option A: ✅ Warning: "Test in progress. Leave page?" (Recommended)
Option B: ✅ Navigate back to Q4 (if implementing SPA navigation)

Should NOT:
❌ Lose all progress
❌ Navigate away silently
❌ Break test state

IMPLEMENT chosen behavior with window.onbeforeunload.
```

---

### 1.3 Scoring & Data Integrity Testing

#### Test Case 1.3.1: Score Calculation Accuracy
```
Create test case with known correct answers:
week1-day1 correct answers: [0, 2, 1, 3, 0, 1, 2, 3, 1, 0]

Student answers: [0, 2, 1, 3, 0, 1, 2, 3, 1, 0] → Score: 10/10 ✅
Student answers: [0, 2, 1, 3, 0, 1, 2, 3, 1, 1] → Score: 9/10 ✅
Student answers: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1] → Score: 0/10 ✅

Expected:
✅ Score calculated server-side (not client-side)
✅ Percentage: (score / totalQuestions) × 100
✅ Rounding: 8/10 = 80.0% (not 80.00000001%)

Manually verify 10 random submissions have correct scores.
If ANY score is wrong, FIX lib/scoring/calculator.ts.
```

#### Test Case 1.3.2: Duplicate Submission Prevention
```
Action: Complete test → Submit → Immediately try to submit same test again
Expected:
✅ Second submission rejected with 409 Conflict
✅ Error message: "You already completed this test today"
✅ Only ONE attempt document created
✅ User stats only updated once

Test with API direct call (bypass UI):
POST /api/tests/[id]/submit with same testId twice
Expected: ✅ Second call returns 409

If duplicates possible, ADD server-side duplicate check.
```

---

### 1.4 Gamification Testing

#### Test Case 1.4.1: Badge Award Logic
```
Test badge criteria:

Badge: first-question
Criteria: totalQuestionsAnswered === 1
Test: Answer first question
Expected: ✅ Badge added to user.badges array

Badge: perfect-score  
Criteria: score === totalQuestions
Test: Submit test with 10/10 score
Expected: ✅ Badge added to user.badges array

Badge: speed-demon
Criteria: timeSpent < 600 seconds (10 min)
Test: Complete test in 9 minutes
Expected: ✅ Badge added to user.badges array

Badge: week-streak
Criteria: currentStreak >= 7
Test: Complete tests for 7 consecutive days
Expected: ✅ Badge added after 7th test

Expected for ALL badges:
✅ No duplicate badges (check if already exists before adding)
✅ newBadgesAwarded array in attempt lists newly awarded badges
✅ Badge persists in user document

If badge logic broken, FIX lib/gamification/badges-enhanced.ts.
```

#### Test Case 1.4.2: XP & Leveling System
```
Test XP calculation:
Correct answer (easy): +5 XP ✅
Correct answer (medium): +10 XP ✅
Correct answer (hard): +15 XP ✅
Perfect test bonus: +50 XP ✅
Streak multiplier (7-day): 1.5x ✅

Test level progression:
Level 1: 0-99 XP
Level 2: 100-174 XP (100 × 1.15^1)
Level 3: 175-201 XP (100 × 1.15^2)
...

Expected:
✅ XP displayed correctly on dashboard
✅ Level updates when XP threshold reached
✅ Level-up animation plays
✅ XP progress bar fills correctly

If XP/leveling broken, FIX lib/gamification/xp.ts.
```

#### Test Case 1.4.3: Streak Calculation
```
Test scenarios:
Day 1: Complete test → Streak = 1 ✅
Day 2: Complete test → Streak = 2 ✅
Day 3: Skip day → Streak = 1 (reset) ✅
Day 4: Complete test → Streak = 2 ✅

Test streak freeze:
User has 1 streak freeze → Skip day → Streak continues ✅
User has 0 streak freezes → Skip day → Streak resets ✅

Expected:
✅ Streak only increments once per day
✅ Streak resets to 1 if day skipped (unless freeze used)
✅ longestStreak updates when currentStreak exceeds it
✅ Streak survives sign out and back in

If streak logic wrong, FIX lib/gamification/streaks.ts.
```

---

### 1.5 Adaptive Learning Testing

#### Test Case 1.5.1: Question Selection Algorithm
```
Test with student ability = 0.5 (medium):
Expected next question:
✅ Difficulty between 0.4-0.6 (zone of proximal development)
✅ Success probability ~70% (optimal learning)
✅ Not too easy (< 0.3) or too hard (> 0.7)

Test after 3 consecutive wrong answers:
Expected:
✅ Next question easier (difficulty - 0.2)
✅ Stays at easier level until student succeeds

If algorithm doesn't adapt, FIX lib/adaptive/learning-engine.ts.
```

#### Test Case 1.5.2: Skill Mastery Tracking
```
Test skill progression:
Start: reading-main-ideas mastery = 0.5
Answer 5 questions correctly in this skill:
Expected: ✅ Mastery increases to ~0.6

Answer 3 questions incorrectly:
Expected: ✅ Mastery decreases slightly (~0.55)

Reach 80% mastery:
Expected:
✅ Skill level changes to "mastered"
✅ Unlocks dependent skills
✅ Badge awarded (if applicable)

If mastery not tracking, FIX lib/adaptive/skill-mastery.ts.
```

---

### 1.6 Daily Challenges Testing

#### Test Case 1.6.1: Challenge Generation
```
Action: Navigate to dashboard on new day
Expected:
✅ 3 daily challenges generated
✅ Mix of easy, medium, hard challenges
✅ Challenges appropriate for user's level
✅ Progress resets to 0 for all challenges

If challenges not generating, FIX lib/gamification/daily-challenges.ts.
```

#### Test Case 1.6.2: Challenge Progress Tracking
```
Test "Perfect Streak" challenge:
Goal: 10 correct answers
Answer 7 correctly:
Expected: ✅ Progress shows 7/10

Complete test with 10/10:
Expected:
✅ Challenge marked complete
✅ Rewards awarded (XP, coins, gems)
✅ Celebration animation plays

If progress not tracking, FIX updateChallengeProgress().
```

---

## PHASE 2: UI/UX TESTING

### 2.1 Student Dashboard Testing

#### Test Case 2.1.1: Dashboard Layout (Samsung Galaxy Tab 1280×800)
```
Expected layout:
✅ Header with user photo, name, level, XP bar
✅ "Today's Mission" card (large, prominent)
✅ Skill tree section (scrollable if needed)
✅ Daily challenges widget
✅ Recent activity section
✅ All elements visible without horizontal scroll
✅ Touch targets ≥ 48px

If layout breaks on tablet, FIX responsive classes.
```

#### Test Case 2.1.2: Skill Tree Visualization
```
Expected:
✅ Skills organized by category (Reading, Math, Writing, Strategy)
✅ Locked skills shown with 🔒 icon
✅ Learning skills shown with progress bar
✅ Mastered skills shown with ⭐ icon
✅ Legendary skills shown with 💎 icon
✅ Clicking skill navigates to practice questions (if unlocked)

If skill tree not displaying, FIX components/dashboard/SkillTree.tsx.
```

#### Test Case 2.1.3: Daily Challenges Widget
```
Expected:
✅ Shows 3 challenges for today
✅ Progress bars for each challenge
✅ Rewards displayed (XP, coins, gems)
✅ Completed challenges highlighted in green
✅ Clicking challenge shows details

If challenges not showing, FIX components/dashboard/DailyChallenges.tsx.
```

---

### 2.2 Test Taking Interface Testing

#### Test Case 2.2.1: Question Display
```
Expected:
✅ Question text clear and readable (font size ≥ 18px)
✅ Options clearly numbered (A, B, C, D)
✅ Selected option highlighted (blue background)
✅ Passage text (if present) scrollable
✅ Image (if present) scales properly
✅ Timer visible and updating
✅ Progress bar accurate

If display issues, FIX app/student/test/[id]/page.tsx.
```

#### Test Case 2.2.2: Answer Selection
```
Test selection behavior:
Click option A → ✅ A highlighted, others normal
Click option B → ✅ B highlighted, A returns to normal
Click option A again → ✅ A stays selected (not toggle)

Expected:
✅ Only one option selectable at a time
✅ Smooth visual transition (200ms)
✅ Touch-friendly (large click area)

If multi-select possible, FIX to radio button behavior.
```

---

### 2.3 Results Page Testing

#### Test Case 2.3.1: Score Display
```
Test with 8/10 score:
Expected:
✅ Large score: "8 out of 10"
✅ Percentage: "80%"
✅ Performance message: "Excellent Work! ⭐"
✅ Circular progress ring at 80%
✅ Confetti animation (if score ≥ 80%)

If display wrong, FIX app/student/results/[attemptId]/page.tsx.
```

#### Test Case 2.3.2: Answer Review
```
For each question:
Correct answer:
✅ Green checkmark
✅ "✓ Your answer: [option]" in green
✅ Explanation shown

Wrong answer:
✅ Red X
✅ "✗ Your answer: [option]" in red
✅ "Correct answer: [option]" in green below
✅ Explanation shown

If review display wrong, FIX answer review component.
```

---

## PHASE 3: SECURITY & DATA INTEGRITY

### 3.1 Authorization Testing

#### Test Case 3.1.1: Route Protection
```
Test URLs while logged out:
- /student → ✅ Redirect to /login
- /student/test/[id] → ✅ Redirect to /login
- /admin → ✅ Redirect to /login

Test with student role:
- /admin → ✅ Redirect to /student with "Access denied"

Test with admin role:
- /admin → ✅ Access granted
- /student → ✅ Access granted (admins can view student view)

If routes not protected, FIX middleware.ts.
```

#### Test Case 3.1.2: API Authorization
```
Test API endpoints without token:
POST /api/tests/[id]/submit → ✅ 401 Unauthorized
GET /api/tests/results/user → ✅ 401 Unauthorized

Test with student token accessing admin endpoint:
GET /api/admin/stats → ✅ 403 Forbidden

If endpoints not protected, ADD authentication checks.
```

---

### 3.2 Data Validation Testing

#### Test Case 3.2.1: Answer Validation
```
Test invalid answers:
Submit with answer = 5 (only 0-3 valid) → ✅ Rejected
Submit with answer = "abc" → ✅ Rejected
Submit with answer = null → ✅ Rejected (if required)

Expected:
✅ Server-side validation
✅ Clear error message
✅ No data corruption

If validation missing, ADD to API routes.
```

#### Test Case 3.2.2: Score Integrity
```
Test score manipulation:
Try to submit with score = 999 → ✅ Server recalculates
Try to submit with answers array length = 5 → ✅ Rejected

Expected:
✅ Scores always calculated server-side
✅ Client-submitted scores ignored
✅ Answers validated before scoring

If client can manipulate scores, FIX immediately.
```

---

## PHASE 4: PERFORMANCE TESTING

### 4.1 Load Testing

#### Test Case 4.1.1: Page Load Speed
```
Test with Lighthouse:
Target metrics:
✅ First Contentful Paint: < 1.5s
✅ Largest Contentful Paint: < 2.5s
✅ Time to Interactive: < 3.5s
✅ Performance score: > 90

If any page scores < 80, OPTIMIZE:
- Add Next.js Image component
- Lazy load components
- Minimize bundle size
```

#### Test Case 4.1.2: Firestore Query Efficiency
```
Measure reads per page:
Dashboard: ≤ 5 reads ✅
Test page: 1 read ✅
Results: 2 reads ✅

If reads excessive:
- Implement caching
- Use batch reads
- Add pagination
```

---

## PHASE 5: ACCESSIBILITY TESTING

### 5.1 Keyboard Navigation
```
Test full flow with keyboard only:
Tab through login → ✅ All elements focusable
Navigate test → ✅ Options selectable with Space
Submit test → ✅ Enter key works

Expected:
✅ Focus indicators visible
✅ Logical tab order
✅ No keyboard traps

If keyboard nav broken, ADD proper focus management.
```

### 5.2 Screen Reader Compatibility
```
Test with NVDA/VoiceOver:
✅ Buttons announced correctly
✅ Question text read aloud
✅ Selected option confirmed
✅ Progress updates announced

If screen reader experience poor, ADD aria-labels.
```

---

## PHASE 6: CROSS-BROWSER & DEVICE TESTING

### 6.1 Browser Compatibility
```
Test on:
✅ Chrome (latest) - Primary
✅ Safari (iOS/Mac)
✅ Firefox
✅ Edge

Expected:
✅ All features work
✅ Visual consistency
✅ No JavaScript errors

If browser-specific issues, ADD fixes.
```

### 6.2 Device Testing
```
Test on:
✅ Samsung Galaxy Tab (1280×800) - Primary
✅ iPhone SE (375×667)
✅ Desktop (1920×1080)

Expected:
✅ Responsive layout
✅ Touch targets ≥ 48px
✅ No horizontal scroll
✅ Text readable

If responsive issues, FIX Tailwind breakpoints.
```

---

## PHASE 7: EDGE CASES & ERROR HANDLING

### 7.1 Network Failure
```
Test offline scenarios:
Start test → Go offline → Answer questions → Go online → Submit
Expected:
✅ Progress saved to localStorage
✅ Submit works after reconnection
✅ No data loss

If offline handling poor, IMPROVE localStorage persistence.
```

### 7.2 Concurrent Sessions
```
Test: Sign in on Device A → Start test → Sign in on Device B → Start same test
Expected:
✅ Warning: "Test in progress on another device"
✅ Option to continue on this device
✅ No data conflicts

If conflicts occur, ADD session management.
```

---

## FINAL CHECKLIST

### Pre-Deployment
```
✅ All test cases passed
✅ No console errors
✅ Lighthouse score > 90
✅ Security rules deployed
✅ All credentials in .env.local
✅ No hardcoded secrets
✅ Error boundaries in place
✅ Loading states for all async operations
✅ Empty states handled
✅ Mobile responsive
✅ Keyboard accessible
✅ Screen reader compatible
```

---

## BUG REPORTING FORMAT

When you find a bug, document it:

```
Bug #X: [Brief description]
Location: [File:Line]
Severity: Critical / High / Medium / Low
Steps to Reproduce:
1. [Step]
2. [Step]
3. [Step]

Expected: [What should happen]
Actual: [What actually happens]
Screenshots: [If applicable]
```

---

## YOUR MISSION

Test EVERYTHING. Fix EVERYTHING. Make it production-ready.

**Begin systematic testing now. Report findings and fixes.**
