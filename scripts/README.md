# Test Data Seeding Scripts

## How to Add Test Data to the Application

### Prerequisites
1. Make sure your `.env.local` file has all Firebase credentials
2. Install required dependencies: `npm install tsx dotenv`

### Method 1: Using the Seed Script (Recommended)

1. **Install dependencies** (if not already installed):
   ```bash
   npm install tsx dotenv --save-dev
   ```

2. **Run the seed script**:
   ```bash
   npx tsx scripts/seed-test-data.ts
   ```

3. **The script will:**
   - Create a sample SAT practice test
   - Add 30 questions (10 Reading, 10 Writing, 10 Math)
   - Set up 3 sections with proper timing
   - Mark the test as published and active

4. **After running, you'll see:**
   - Test ID in the console
   - Number of questions created
   - Test summary

### Method 2: Using Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to Firestore Database
4. Create a new document in the `tests` collection
5. Add test metadata
6. Create a subcollection `questions` under the test document
7. Add questions one by one

### Method 3: Using API Endpoint (For Admins)

Create an API endpoint to add tests programmatically (requires admin authentication).

## Test Data Structure

### Test Document
```json
{
  "title": "SAT Practice Test #1",
  "description": "A comprehensive practice test",
  "status": "published",
  "isActive": true,
  "sections": [...],
  "totalQuestions": 30,
  "totalTimeLimit": 5100,
  "difficulty": "intermediate"
}
```

### Question Document
```json
{
  "type": "multiple-choice",
  "subject": "reading",
  "difficulty": "medium",
  "questionNumber": 1,
  "sectionNumber": 1,
  "questionText": "...",
  "options": [...],
  "correctAnswer": "B",
  "explanation": "...",
  "topicTags": [...],
  "points": 1
}
```

## Verifying Test Data

1. **Check Firebase Console:**
   - Go to Firestore
   - Verify `tests` collection has your test
   - Check `tests/{testId}/questions` subcollection

2. **Check Application:**
   - Log in as a student
   - Go to Student Dashboard
   - You should see the test in "Available Tests"

## Troubleshooting

- **Error: "Missing Firebase Admin credentials"**
  - Check `.env.local` has `FIREBASE_PRIVATE_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`

- **Error: "Permission denied"**
  - Make sure Firestore security rules allow writes
  - Or temporarily disable security rules for testing

- **Test not showing in app**
  - Check `status` is set to `"published"`
  - Check `isActive` is set to `true`
  - Verify the test document structure matches the expected format

## Adding More Tests

To add more tests, you can:
1. Modify `seed-test-data.ts` to create multiple tests
2. Run the script multiple times
3. Or create a more comprehensive seed file with multiple test variations
