# Firestore API Setup Guide

## ⚠️ Error: Cloud Firestore API has not been used

If you see this error:
```
PERMISSION_DENIED: Cloud Firestore API has not been used in project sat-mock-test-platform before or it is disabled.
```

## ✅ Solution: Enable Firestore API

### Step 1: Enable Firestore API
1. Go to: https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=sat-mock-test-platform
2. Click **"Enable"** button
3. Wait 2-3 minutes for the API to propagate

### Step 2: Verify Firestore is Enabled
1. Go to Firebase Console: https://console.firebase.google.com/project/sat-mock-test-platform
2. Navigate to **Firestore Database** in the left menu
3. If you see "Create database" or your database, Firestore is ready

### Step 3: Create Firestore Database (if needed)
1. In Firebase Console → Firestore Database
2. Click **"Create database"**
3. Choose **"Start in production mode"** (we'll set up security rules later)
4. Select a location (choose closest to your users)
5. Click **"Enable"**

### Step 4: Set Up Security Rules (Important!)
1. Go to Firestore Database → Rules tab
2. Replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
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
  }
}
```

3. Click **"Publish"**

## 🔧 Alternative: Use Firebase Console

If the direct link doesn't work:
1. Go to: https://console.cloud.google.com/
2. Select project: **sat-mock-test-platform**
3. Go to **APIs & Services** → **Library**
4. Search for **"Cloud Firestore API"**
5. Click **"Enable"**

## ✅ Verification

After enabling:
1. Restart your Next.js dev server: `npm run dev`
2. Try signing in again
3. The error should be gone
4. User menu should appear in the top right

## 🎯 Current Behavior (Fallback)

Even if Firestore API is not enabled, the app will:
- ✅ Still work with Firebase Auth data
- ✅ Show user menu with name and photo
- ✅ Allow basic functionality
- ⚠️ But won't save profile data or test results

**Note:** For full functionality, you **must** enable Firestore API.

---

**Status:** The app now gracefully handles Firestore API errors and falls back to Firebase Auth data, so the user menu will still appear even if Firestore is not enabled.
