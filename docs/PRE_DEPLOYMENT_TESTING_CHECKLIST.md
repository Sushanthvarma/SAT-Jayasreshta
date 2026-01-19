# 🧪 Pre-Deployment Testing Checklist

## 📋 Complete Application Testing Guide

Use this checklist to test all features **BEFORE** deploying to Vercel. This ensures everything works correctly and reduces post-deployment issues.

---

## 🔐 Authentication & User Management

### Login/Logout
- [ ] **Login Page** (`/login`)
  - [ ] Google Sign-In button works
  - [ ] Redirects to dashboard after login
  - [ ] Shows loading state during sign-in
  - [ ] Error handling for failed sign-in

- [ ] **Logout**
  - [ ] Sign out button works
  - [ ] Redirects to login page
  - [ ] Clears user session

- [ ] **Session Persistence**
  - [ ] User stays logged in after page refresh
  - [ ] User stays logged in after closing browser (if "Remember me" implemented)
  - [ ] Auto-redirect if not authenticated

### Grade Selection (First Time & Persistence)
- [ ] **First Login**
  - [ ] Grade selection modal appears
  - [ ] Can select grade (4th-12th)
  - [ ] Grade saves successfully
  - [ ] Modal closes after selection

- [ ] **Subsequent Logins**
  - [ ] Grade selection modal does NOT appear if grade is already saved
  - [ ] Saved grade is loaded from profile
  - [ ] Dashboard shows correct grade
  - [ ] Tests are filtered by selected grade

- [ ] **Change Grade**
  - [ ] "Change Grade" button works
  - [ ] Can select new grade
  - [ ] New grade saves and updates immediately
  - [ ] Tests refresh to show new grade's tests

---

## 📊 Student Dashboard (`/student`)

### Page Load
- [ ] Page loads without errors
- [ ] Shows user profile information
- [ ] Displays correct grade badge
- [ ] Shows quick stats (completed tests, in progress, etc.)

### Tabs Navigation
- [ ] **Practice Tests Tab**
  - [ ] Shows tests for selected grade only
  - [ ] Test cards display correctly
  - [ ] Can click to start test
  - [ ] Shows "No tests available" if none exist

- [ ] **My Progress Tab**
  - [ ] Shows test attempts
  - [ ] Displays progress charts
  - [ ] Shows skill mastery data
  - [ ] Shows XP and level progress

- [ ] **Daily Challenges Tab**
  - [ ] Shows daily challenges
  - [ ] Can view challenge details
  - [ ] Shows completion status

### Skill Tree
- [ ] Skill tree displays correctly
- [ ] Shows mastery levels
- [ ] Can filter by category
- [ ] Hover effects work
- [ ] Responsive on mobile

### Audio Feedback
- [ ] Click sounds play on interactions
- [ ] Success sounds on achievements
- [ ] Error sounds on failures
- [ ] Audio can be toggled (if implemented)

---

## 📝 Test Taking (`/student/test/[id]`)

### Test Start
- [ ] Can start a new test
- [ ] Timer starts correctly
- [ ] Questions load properly
- [ ] Navigation works (next/previous)

### During Test
- [ ] Can select answers
- [ ] Can skip questions
- [ ] Can navigate between questions
- [ ] Timer counts down correctly
- [ ] Auto-save works (if implemented)
- [ ] Can review all questions
- [ ] Can see question numbers

### Test Submission
- [ ] Can submit test
- [ ] Confirmation dialog appears
- [ ] Submission processes correctly
- [ ] Redirects to results page
- [ ] Shows success message

### Test Resumption
- [ ] Can resume in-progress tests
- [ ] Loads from correct question
- [ ] Previous answers are saved
- [ ] Timer continues correctly

---

## 📈 Results Page (`/student/results/[attemptId]`)

### Results Display
- [ ] Shows overall score
- [ ] Displays section breakdown
- [ ] Shows strengths and weaknesses
- [ ] Provides recommendations
- [ ] Shows time taken
- [ ] Displays correct/incorrect answers

### Navigation
- [ ] "Back to Dashboard" button works
- [ ] Can view detailed breakdown
- [ ] Can retake test (if allowed)

---

## 🏆 Leaderboard (`/student/leaderboard`)

### Display
- [ ] Leaderboard loads without errors
- [ ] Shows top users
- [ ] Displays user's rank
- [ ] Shows XP, level, streak
- [ ] Shows percentile/statistics
- [ ] Top 3 podium displays correctly

### Empty State
- [ ] Shows helpful message if no data
- [ ] Provides call-to-action

### Refresh
- [ ] Refresh button works
- [ ] Data updates correctly

---

## 👤 Profile Page (`/student/profile`)

### View Profile
- [ ] Profile loads correctly
- [ ] Shows all user information
- [ ] Displays grade correctly
- [ ] Shows stats and achievements

### Edit Profile
- [ ] Can edit profile fields
- [ ] Can change grade
- [ ] Can update personal information
- [ ] Changes save successfully
- [ ] Shows success message

---

## 🎯 Progress Page (`/student/progress`)

### Progress Display
- [ ] Shows test history
- [ ] Displays progress charts
- [ ] Shows skill mastery
- [ ] Shows XP progression
- [ ] Displays badges earned

---

## 🏅 Badges Page (`/student/badges`)

### Badges Display
- [ ] Shows all available badges
- [ ] Displays earned badges
- [ ] Shows locked badges
- [ ] Badge details are correct

---

## 👨‍💼 Admin Dashboard (`/admin`)

### Access Control
- [ ] Only admins can access
- [ ] Non-admins redirected
- [ ] Role check works correctly

### Dashboard Overview
- [ ] Statistics display correctly
- [ ] Charts render properly
- [ ] Data is accurate

---

## 📚 Test Management (`/admin/tests`)

### File Scanning
- [ ] Scans test files correctly
- [ ] Shows valid/invalid files
- [ ] Displays file statistics
- [ ] Shows import status (new/imported/updated)

### Import Process
- [ ] Can select files to import
- [ ] Bulk selection works
- [ ] Import options work (publish, activate, overwrite)
- [ ] Import completes successfully
- [ ] Shows success/error messages
- [ ] Tests appear in database after import

### Filters & Search
- [ ] Search works
- [ ] Grade filter works
- [ ] Subject filter works
- [ ] Status filter works
- [ ] Filters combine correctly

### Tabs
- [ ] Overview tab works
- [ ] Files tab works
- [ ] Organized tab works
- [ ] Invalid tab shows errors

---

## 📧 Email Management (`/admin/email`)

### Email Features
- [ ] Can view email templates
- [ ] Can send test emails
- [ ] Email preferences work

---

## 📊 Analytics (`/admin/analytics`)

### Analytics Display
- [ ] Charts load correctly
- [ ] Data is accurate
- [ ] Filters work
- [ ] Time period selection works

---

## 📱 Mobile Responsiveness

### Navigation
- [ ] Header is responsive
- [ ] Hamburger menu works on mobile
- [ ] Navigation links are touch-friendly (min 44px)
- [ ] User menu is accessible on mobile

### Dashboard
- [ ] Dashboard layout adapts to mobile
- [ ] Cards stack correctly
- [ ] Text is readable
- [ ] Buttons are properly sized

### Test Taking
- [ ] Test interface works on mobile
- [ ] Questions are readable
- [ ] Answer options are touch-friendly
- [ ] Navigation buttons work
- [ ] Timer is visible

### Forms
- [ ] Input fields are properly sized
- [ ] Forms are usable on mobile
- [ ] Dropdowns work correctly

---

## 🔊 Audio Feedback

### Sound Effects
- [ ] Click sounds on buttons
- [ ] Success sounds on achievements
- [ ] Error sounds on failures
- [ ] Notification sounds
- [ ] Level up sounds
- [ ] Achievement sounds

### Audio Settings
- [ ] Audio can be toggled (if implemented)
- [ ] Volume can be adjusted (if implemented)
- [ ] Settings persist

---

## 🔄 Data Persistence

### Grade Selection
- [ ] Grade saves to Firestore
- [ ] Grade loads on next login
- [ ] Grade persists across sessions
- [ ] Grade change updates immediately

### Test Progress
- [ ] Test attempts save correctly
- [ ] Can resume tests
- [ ] Answers are saved
- [ ] Timer state persists

### User Profile
- [ ] Profile changes save
- [ ] Profile loads correctly
- [ ] Data persists across sessions

---

## ⚠️ Error Handling

### Network Errors
- [ ] Handles API failures gracefully
- [ ] Shows user-friendly error messages
- [ ] Provides retry options
- [ ] Doesn't crash the app

### Missing Data
- [ ] Handles empty states
- [ ] Shows helpful messages
- [ ] Provides next steps

### Authentication Errors
- [ ] Handles expired tokens
- [ ] Redirects to login if needed
- [ ] Shows clear error messages

---

## 🚀 Performance

### Page Load
- [ ] Pages load quickly
- [ ] No excessive loading times
- [ ] Images load properly
- [ ] No console errors

### Interactions
- [ ] Buttons respond quickly
- [ ] Forms submit without delay
- [ ] Navigation is smooth
- [ ] No lag or stuttering

---

## 🔍 Browser Compatibility

### Desktop Browsers
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### Mobile Browsers
- [ ] Chrome (Android)
- [ ] Safari (iOS)
- [ ] Mobile viewport works correctly

---

## 📝 Quick Test Script

Run this locally before deployment:

```bash
# 1. Start dev server
npm run dev

# 2. Test in browser:
# - Login with Google
# - Select grade (should only appear once)
# - Navigate to all pages
# - Test import functionality (admin)
# - Check mobile view
# - Test audio feedback
# - Verify grade persistence (logout and login again)

# 3. Check console for errors
# 4. Test on mobile device
# 5. Verify all features work
```

---

## ✅ Pre-Deployment Checklist

Before pushing to Vercel:

- [ ] All tests pass locally
- [ ] No console errors
- [ ] Grade selection works and persists
- [ ] All pages load correctly
- [ ] Mobile responsive
- [ ] Audio feedback works
- [ ] Error handling is robust
- [ ] Performance is acceptable
- [ ] All features tested

---

## 🐛 Common Issues to Check

1. **Grade Selection Appearing Every Time**
   - Check if `userData.grade` is being saved
   - Verify `refreshProfile()` updates `userData`
   - Check `gradeInitialized` ref logic

2. **404 Errors**
   - Verify all page files exist
   - Check routing structure
   - Ensure dynamic routes work

3. **Quota Errors**
   - Check Firestore query limits
   - Verify batch operations
   - Check for unnecessary queries

4. **Empty Leaderboard**
   - Verify users have `totalXP` field
   - Check query fallbacks
   - Ensure admin users are filtered

5. **Test Import Issues**
   - Verify test file structure
   - Check validation rules
   - Ensure grade validation allows 4th-12th

---

**Status**: ✅ Use this checklist before every deployment
**Last Updated**: Latest commit
