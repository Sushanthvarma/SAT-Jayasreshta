# Firestore Database Setup Guide

## Problem
No database exists in Firebase Console. We need to create and configure Firestore.

## Step-by-Step Setup

### Step 1: Create Firestore Database

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Select your project: `sat-mock-test-platform`

2. **Navigate to Firestore**
   - In the left sidebar, click **"Firestore Database"**
   - If you see "Get started" or "Create database", click it

3. **Choose Database Mode**
   - Select **"Start in production mode"** (we'll add rules later)
   - OR **"Start in test mode"** (for development - allows all reads/writes for 30 days)

4. **Choose Location**
   - Select a location closest to you (e.g., `us-central`, `asia-south1`, `europe-west`)
   - Click **"Enable"**
   - Wait for database creation (takes 1-2 minutes)

### Step 2: Set Up Security Rules

1. **Go to Firestore Rules**
   - In Firestore Database page, click **"Rules"** tab
   - Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
      // Admins can write any user profile
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Tests are readable by all authenticated users
    match /tests/{testId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Test questions are readable by all authenticated users
    match /tests/{testId}/questions/{questionId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Test attempts are readable/writable by the user who created them
    match /testAttempts/{attemptId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // Test results are readable/writable by the user who created them
    match /testResults/{resultId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // Leaderboard data (read-only for authenticated users)
    match /leaderboard/{document=**} {
      allow read: if request.auth != null;
      allow write: if false; // Only server-side writes
    }
  }
}
```

2. **Click "Publish"** to save the rules

### Step 3: Enable Firestore API (If Not Already Enabled)

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select project: `sat-mock-test-platform`

2. **Enable Firestore API**
   - Go to **"APIs & Services"** → **"Library"**
   - Search for **"Cloud Firestore API"**
   - Click on it and click **"Enable"**

   OR use direct link:
   - https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=sat-mock-test-platform

### Step 4: Verify Setup

1. **Check Firestore Database**
   - Go back to Firebase Console → Firestore Database
   - You should see an empty database with no collections yet

2. **Test Connection**
   - Restart your Next.js dev server: `npm run dev`
   - Try logging in again
   - Check browser console for errors

### Step 5: Create Your First User (Admin)

After logging in, your user will be automatically created in Firestore. Then:

1. **Go to Firestore Database**
   - Click on **"users"** collection (it will be created on first login)
   - Find your user document (by your email or UID)

2. **Set Admin Role**
   - Click on your user document
   - Click **"Edit document"** (pencil icon)
   - Add field: `role` = `"admin"` (type: string)
   - Click **"Update"**

### Step 6: Import Tests

Now you can import the 144 generated tests:

1. **Go to Admin Panel**
   - Navigate to: `http://localhost:3000/admin/tests`
   - Click **"Rescan Files"**
   - You should see 144 test files

2. **Import Tests**
   - Check: ✅ "Publish immediately"
   - Check: ✅ "Activate for students"
   - Click **"Select All Valid"**
   - Click **"Import Selected Tests"**

## Quick Checklist

- [ ] Firestore database created
- [ ] Security rules published
- [ ] Firestore API enabled
- [ ] User logged in (creates user document)
- [ ] User role set to "admin"
- [ ] Tests imported via admin panel

## Troubleshooting

### "Firestore API not enabled" error
- Enable it in Google Cloud Console (Step 3 above)
- Wait 1-2 minutes for propagation
- Restart dev server

### "Permission denied" errors
- Check security rules are published
- Verify user role is set to "admin" in Firestore
- Check user document exists in `users` collection

### No collections visible
- This is normal for a new database
- Collections are created automatically when:
  - User logs in → creates `users` collection
  - Tests are imported → creates `tests` collection
  - Student takes test → creates `testAttempts` and `testResults` collections

### Can't access admin panel
- Make sure your user document has `role: "admin"` in Firestore
- Check the `users` collection exists
- Verify you're logged in

## Next Steps

Once Firestore is set up:
1. ✅ Import tests via admin panel
2. ✅ Tests will appear in student dashboard
3. ✅ Students can take tests
4. ✅ Results will be saved automatically

---

**Need Help?** Check the browser console for specific error messages.
