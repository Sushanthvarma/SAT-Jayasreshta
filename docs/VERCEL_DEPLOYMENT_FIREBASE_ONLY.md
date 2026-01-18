# 🚀 Vercel Deployment - Firebase Only (No SendGrid)

Quick deployment guide focusing on Firebase configuration only.

---

## 📋 Prerequisites

- ✅ Vercel account (https://vercel.com)
- ✅ GitHub account
- ✅ Code pushed to GitHub
- ✅ Firebase project configured

---

## 🔑 Environment Variables to Add in Vercel

### Firebase Client (Public - NEXT_PUBLIC_*)

Add these in Vercel Dashboard → Project → Settings → Environment Variables:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAAsFBhMBvyqqKI76finzT6sNR2hyKbEwE
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=sat-mock-test-platform.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sat-mock-test-platform
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=sat-mock-test-platform.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=211898743503
NEXT_PUBLIC_FIREBASE_APP_ID=1:211898743503:web:53f1a116e898c7776c95ba
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-QH3FNHLTLB
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**Note:** Update `NEXT_PUBLIC_APP_URL` after deployment with your actual Vercel URL.

### Firebase Admin (Private - Server-side only)

```
FIREBASE_PROJECT_ID=sat-mock-test-platform
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@sat-mock-test-platform.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCjGBT0+d/PVorR\n+4C+kJ3YxtmR1jIASmVAU0q2eGUmESyXTQZUGLs9zEHJxyQsrl05oVahDSphu7GU\n5TmK6f/uY6wmDJTiwCaHkZrn4BPHM9qy9lvoNxBzyXcakNS8MTue0GA+a5hhTa+0\nI6FVXFzc9LPH3kjFv4ZejTxvzxrsncf9jqBBzVnFND9nOaPYyYBOfgzP2harQ1kU\nugZ3TlyUSgIyjn2xL/tI58pt7yyPoPT7UvLItpqBTVoAjC3JTA9ibsa6NrFM1Mu2\nkiogH1u20J59e3Bp6e8uVy2sKDe00hYtKV1EXVMfQ2J5Jvu1y+9KRFI2vVsngyjM\n+gvl6T7tAgMBAAECggEAAyEZ1rIw0lXd3V8QCgEnIi+Pan4bqf76Sia11T2rfk/0\ni/eje6AY2sUWbVkFb30JaWHYSSOUbDSRfYdX/Ok/IaE5B525QXSt4bg+Bh1MOZDu\nP2tz5xBERILCnbz7KtMVuGAwzbLyKaXJ+yett3cJihqA3dwhYvfyQpuINhTZLV35\nCzy//Glwa5ne7ShgPgI8D01fJ9DNwuPWOruNDVschbbjQ1vD5OpAjvaSYmwuXai9\nMF3VsbfmUvsej4nuWqqB4bfsAgj55Wcf54XMIo4a9XLV9xv5StIAUGU4U66roxZR\nDJC0X4anEBOlylILWsqhTmqIZ0RI2Su2Y/5EoZZM4QKBgQDkw2vKBvosvjE8P7p6\nrafFhkNxunFosk7dSK36GuLa/7o4dKKsBYVDqQgYyfMt8UchUYKIDnDAVfUdMKp8\nAJ+sx7f3AlmQKk2OqhH/9sJRRpyUm+6V4lzxGR6j6yxMUCFszaEhMDmeWmqOHxmJ\nLETp1O7eNEZzs/9E/1B/sFvqDQKBgQC2gxj7pE3ZCI1VwpS5il7MWSxQBlDLLS0d\nJw6+94+/RdJqZHn4ooMajT264C5aIhW+hvl+AaV6MGbz3DyLQBT7PyJFudSFK5kc\n+AdGtxixGPGbkGe6EDg829qiGiAdQz0uBJKm3q+jQfNJQmA6GQkgzUsMhx6a5ejx\nQ3RUJNfQYQKBgAYFcsfdiSY2V1trnf/upDTZxNqwep2z28mNSS8FGCWFh6RGxaVb\ne9d9En58ik8SQ7oHyDTGlIcrfAkpp8MdzRYiJ6BzymG2C1aO+WxQVWsIPcTXmd8O\nFz4tWBYecYsMrOSNQQl7mHinjphxDx4CMUoqVaM5owUWnsh1I+xIexLdAoGBAJM0\nm+LjO7LQdgZ0wbYAx8M0LUyCO4oUbu2zge4/CF7ytur/DW2fzfSNdPuUM26ZTUZ1\n4Sdjto8eGPuZZ++8iO+4lTD92E5swrsdxeigZzb38m9RgogM6v8TKH1UaxCPGfpS\nz+HtfGZGHC67bZeOd9FQI7cACIxQ4ZgumtX/PV4hAoGBAJuaNFbb5ldedw5RpHGW\nKL+LKFeBCNiCBNM5dQVRQ6TT9XfawcJYwaU3cN1RnyRDIpOqklNxN4tQYmXpTPKo\nkWAG5GvmcUEKUXdQde3HCXdTBkHuk5H3WPryn8xfmwSOpZSwcpdEz6ITsX2QwxWC\nnDSczH2twGZVln4aWwQT1QfC\n-----END PRIVATE KEY-----"
```

**⚠️ CRITICAL for FIREBASE_PRIVATE_KEY:**
- Copy the ENTIRE value from your `.env.local` file (including quotes and `\n` characters)
- It should start with `"-----BEGIN PRIVATE KEY-----\n` and end with `\n-----END PRIVATE KEY-----"`
- Vercel will handle the `\n` characters correctly

---

## 🚀 Deployment Steps

### 1. Push to GitHub (if not already done)

```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### 2. Deploy to Vercel

1. Go to: https://vercel.com
2. Sign in with GitHub
3. Click **"Add New..."** → **"Project"**
4. Import your repository: `yourusername/sat-mock-test`
5. **Before clicking Deploy:**
   - Scroll to **"Environment Variables"**
   - Add all 10 variables listed above
   - For each variable, select: **Production, Preview, Development** (all three)
6. Click **"Deploy"**
7. Wait 2-5 minutes for build to complete

### 3. Post-Deployment

1. **Note your Vercel URL** (e.g., `https://sat-mock-test.vercel.app`)
2. **Update NEXT_PUBLIC_APP_URL:**
   - Go to Project → Settings → Environment Variables
   - Edit `NEXT_PUBLIC_APP_URL`
   - Change to: `https://your-actual-vercel-url.vercel.app`
   - Save
   - **Redeploy** (click "Redeploy" on latest deployment)
3. **Add Vercel domain to Firebase:**
   - Go to: https://console.firebase.google.com
   - Select project: `sat-mock-test-platform`
   - Go to: **Authentication** → **Settings** → **Authorized domains**
   - Click **"Add domain"**
   - Add: `your-app.vercel.app`
   - Click **"Add"**

### 4. Test

- [ ] Visit your Vercel URL
- [ ] Test Google Sign-In
- [ ] Test student dashboard
- [ ] Test admin dashboard
- [ ] Verify Firestore data syncs

---

## ✅ Quick Checklist

**Before Deploy:**
- [ ] Code pushed to GitHub
- [ ] All 10 environment variables ready to copy

**During Deploy:**
- [ ] All 10 environment variables added in Vercel
- [ ] All variables enabled for Production, Preview, Development
- [ ] Deploy button clicked

**After Deploy:**
- [ ] `NEXT_PUBLIC_APP_URL` updated to actual Vercel URL
- [ ] Vercel domain added to Firebase Authorized Domains
- [ ] Redeployed after updating `NEXT_PUBLIC_APP_URL`
- [ ] Tested authentication
- [ ] Tested student dashboard
- [ ] Tested admin dashboard

---

## 🔧 Troubleshooting

### Build Fails: "Missing Firebase Admin credentials"

**Solution:**
- Verify `FIREBASE_PRIVATE_KEY` includes the quotes and `\n` characters
- Check all three admin variables are added
- Ensure they're enabled for the correct environment

### Authentication Not Working

**Solution:**
1. Check Firebase Authorized Domains includes your Vercel URL
2. Verify `NEXT_PUBLIC_APP_URL` matches your actual Vercel URL
3. Check browser console for errors

### FIREBASE_PRIVATE_KEY Error

**Solution:**
- Copy the ENTIRE value from `.env.local` including:
  - Opening quote: `"`
  - `-----BEGIN PRIVATE KEY-----\n`
  - All the key content
  - `\n-----END PRIVATE KEY-----"`
  - Closing quote: `"`

---

## 📝 All 10 Variables Summary

1. `NEXT_PUBLIC_FIREBASE_API_KEY`
2. `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
3. `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
4. `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
5. `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
6. `NEXT_PUBLIC_FIREBASE_APP_ID`
7. `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
8. `NEXT_PUBLIC_APP_URL` (update after deployment)
9. `FIREBASE_PROJECT_ID`
10. `FIREBASE_CLIENT_EMAIL`
11. `FIREBASE_PRIVATE_KEY` (⚠️ includes quotes and `\n`)

**Total: 11 variables** (8 public, 3 private)

---

**Ready to deploy! 🚀**
