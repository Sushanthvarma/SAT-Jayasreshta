# Quick Start Guide - Adding Test Data

## 🚀 Fastest Way to Add Test Data

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Run the Seed Script
```bash
npm run seed
```

That's it! The script will:
- ✅ Create a sample SAT practice test
- ✅ Add 30 questions (10 Reading, 10 Writing, 10 Math)
- ✅ Set up 3 sections with proper timing
- ✅ Mark the test as published and active

### Step 3: Verify in Application
1. Start your dev server: `npm run dev`
2. Log in to the application
3. Go to Student Dashboard
4. You should see "SAT Practice Test #1" in the Available Tests section

## 📋 What Gets Created

- **1 Test** with 3 sections:
  - Reading Section (10 questions, 30 minutes)
  - Writing Section (10 questions, 30 minutes)
  - Math Section (10 questions, 25 minutes)
- **Total: 30 questions** with various difficulty levels
- **Total Time: 85 minutes**

## 🎯 Test the Application

1. **Start a Test:**
   - Click "Start Test" on any available test
   - The test-taking interface will open

2. **Take the Test:**
   - Answer questions
   - Navigate between questions
   - Watch the timer countdown
   - Answers auto-save every 30 seconds

3. **Submit and View Results:**
   - Click "Submit Test" when done
   - View detailed results with:
     - Overall score
     - Section breakdown
     - Performance by difficulty
     - Strengths and weaknesses
     - Recommendations

## 🔧 Troubleshooting

### Test Not Showing Up?
- Check Firebase Console → Firestore → `tests` collection
- Verify the test has:
  - `status: "published"`
  - `isActive: true`

### Script Fails?
- Make sure `.env.local` has all Firebase credentials
- Check that Firestore is enabled in Firebase Console
- Verify you have write permissions

### Need More Tests?
- Run `npm run seed` multiple times (it creates a new test each time)
- Or modify `scripts/seed-test-data.ts` to create multiple tests

## 📝 Next Steps

After adding test data, you can:
1. ✅ Test the complete user flow
2. ✅ Verify scoring works correctly
3. ✅ Check progress tracking
4. ✅ Test gamification (badges, streaks)
5. ✅ View results and analytics

## 💡 Pro Tips

- The seed script creates realistic test data with proper structure
- All questions have explanations for learning
- Questions are tagged by topic and skill for analytics
- You can modify the script to create tests with different difficulty levels

---

**Ready to test? Run `npm run seed` and start exploring!** 🎉
