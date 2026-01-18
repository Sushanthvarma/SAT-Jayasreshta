# How to Import Tests - Quick Guide

## Problem
Tests are generated as JSON files but need to be imported into Firestore to be visible to students.

## Solution: Use Admin Panel

### Step 1: Access Admin Panel
1. Make sure you're logged in
2. Go to: `http://localhost:3000/admin/tests`
3. If you get redirected, you need admin access (see Step 2)

### Step 2: Get Admin Access (If Needed)

If you don't have admin access, you need to set your user role to 'admin' in Firestore:

**Option A: Via Firebase Console**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `sat-mock-test-platform`
3. Go to Firestore Database
4. Find the `users` collection
5. Find your user document (by your user ID from Firebase Auth)
6. Edit the document and set `role: "admin"`
7. Save

**Option B: Via Script (if you have Firebase credentials)**
Run this in your browser console (on any page):
```javascript
// Get your user ID
const auth = getAuth();
const user = auth.currentUser;
console.log('Your User ID:', user.uid);
```

Then manually update Firestore or use the Firebase Console.

### Step 3: Import Tests via Admin Panel

1. **Go to Admin Tests Page**
   - Navigate to `/admin/tests`
   - You should see the test management interface

2. **Scan for Tests**
   - Click "Rescan Files" or "Scan for New Tests"
   - The system will scan the `tests/` directory
   - You should see 144 test files listed

3. **Configure Import Options**
   - ✅ Check "Publish immediately" (makes tests visible)
   - ✅ Check "Activate for students" (enables tests)
   - ✅ Check "Overwrite existing" (if re-importing)
   - ✅ Check "Skip invalid files" (safety)

4. **Import Tests**
   - Click "Select All Valid" to select all 144 tests
   - Click "Import Selected Tests"
   - Wait for import to complete (may take a minute for 144 tests)

5. **Verify**
   - Go back to `/student`
   - You should now see tests available!

## Alternative: Quick Import Script

If you have Firebase Admin credentials in `.env.local`, you can run:

```bash
npm run import-all-tests
```

This will automatically import all 144 tests with publish and activate enabled.

## Troubleshooting

### "No tests available" after import
- Check that tests are `status: 'published'` and `isActive: true` in Firestore
- Verify the `/api/tests` endpoint returns tests
- Check browser console for errors

### "Access denied" when accessing admin panel
- Your user role must be set to 'admin' in Firestore
- Check the `users` collection in Firestore
- Your user document should have: `role: "admin"`

### Tests not showing in student dashboard
- Verify tests are published: `status === 'published'`
- Verify tests are active: `isActive === true`
- Check Firestore `tests` collection
- Refresh the student dashboard

## Quick Check

Run this in browser console on `/student` page:
```javascript
fetch('/api/tests')
  .then(r => r.json())
  .then(d => console.log('Available tests:', d));
```

This will show you what tests are available via the API.
