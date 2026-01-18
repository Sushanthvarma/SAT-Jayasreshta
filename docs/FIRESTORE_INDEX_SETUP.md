# Firestore Index Setup Guide

## 🔥 Required Composite Indexes

The application requires several Firestore composite indexes for efficient queries. These indexes have been configured in `firestore.indexes.json`.

## 📋 Required Indexes

### 1. testResults - userId + completedAt (Ascending)
**Used by:** Weekly Reports API
- Collection: `testResults`
- Fields: `userId` (Ascending), `completedAt` (Ascending)
- Purpose: Query test results by user and date range

### 2. testResults - userId + completedAt (Descending)
**Used by:** User Results API
- Collection: `testResults`
- Fields: `userId` (Ascending), `completedAt` (Descending)
- Purpose: Get user's test results sorted by completion date

### 3. testAttempts - testId + userId + status
**Used by:** Test Start API
- Collection: `testAttempts`
- Fields: `testId` (Ascending), `userId` (Ascending), `status` (Ascending)
- Purpose: Find existing attempts for a test and user

### 4. testAttempts - userId + startedAt (Descending)
**Used by:** Inactivity Reminders
- Collection: `testAttempts`
- Fields: `userId` (Ascending), `startedAt` (Descending)
- Purpose: Get user's most recent attempt

### 5. testResults - attemptId
**Used by:** Result Lookup
- Collection: `testResults`
- Fields: `attemptId` (Ascending)
- Purpose: Find result by attempt ID

---

## 🚀 Deployment Options

### Option 1: Deploy via Firebase CLI (Recommended)

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Initialize Firebase** (if not already done):
   ```bash
   firebase init firestore
   ```
   - Select your project
   - Use existing `firestore.indexes.json`
   - Use existing `firestore.rules` (if exists)

4. **Deploy indexes**:
   ```bash
   firebase deploy --only firestore:indexes
   ```

### Option 2: Create Indexes Manually via Firebase Console

1. **Click the link in the error message** (provided by Firestore)
   - The error message includes a direct link to create the index
   - Example: `https://console.firebase.google.com/v1/r/project/.../firestore/indexes?create_composite=...`

2. **Or manually create in Firebase Console**:
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select your project
   - Navigate to **Firestore Database** → **Indexes** tab
   - Click **Create Index**
   - Add the required fields as specified above

### Option 3: Use the Direct Link from Error

When you see the error:
```
FAILED_PRECONDITION: The query requires an index. You can create it here: https://console.firebase.google.com/...
```

Simply click the link and Firebase will automatically create the index for you!

---

## ⏱️ Index Creation Time

- **Simple indexes**: Usually ready in a few seconds
- **Composite indexes**: Can take 1-5 minutes to build
- **Large collections**: May take longer (up to 30 minutes for very large datasets)

You'll receive an email notification when the index is ready.

---

## ✅ Verify Indexes

After deployment, verify indexes exist:

1. Go to Firebase Console → Firestore Database → Indexes
2. Check that all required indexes are listed
3. Status should show "Enabled" (green checkmark)

---

## 🔧 Troubleshooting

### Index Still Building
- Wait a few minutes and try again
- Check Firebase Console for index status
- Large collections may take longer

### Index Creation Failed
- Check Firebase Console for error messages
- Ensure you have proper permissions
- Verify field names match exactly (case-sensitive)

### Query Still Fails After Index Creation
- Clear browser cache
- Wait 1-2 minutes for index to fully propagate
- Verify index fields match query exactly

---

## 📝 Notes

- Indexes are automatically maintained by Firestore
- No manual updates needed once created
- Indexes don't affect write performance significantly
- Composite indexes are required for queries with multiple `where` clauses or `orderBy` with `where`
