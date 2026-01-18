# ⚡ Vercel Quick Start - Firebase Only

## 🎯 Your Environment Variables (Copy These to Vercel)

### Step 1: Go to Vercel Dashboard
1. Visit: https://vercel.com
2. Sign in with GitHub
3. Click **"Add New..."** → **"Project"**
4. Import: `yourusername/sat-mock-test`

### Step 2: Add These 11 Environment Variables

**Before clicking "Deploy", add all variables in the "Environment Variables" section:**

#### Public Variables (NEXT_PUBLIC_*) - 8 variables

```
NEXT_PUBLIC_FIREBASE_API_KEY
Value: AIzaSyAAsFBhMBvyqqKI76finzT6sNR2hyKbEwE
Environment: ✅ Production ✅ Preview ✅ Development

NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
Value: sat-mock-test-platform.firebaseapp.com
Environment: ✅ Production ✅ Preview ✅ Development

NEXT_PUBLIC_FIREBASE_PROJECT_ID
Value: sat-mock-test-platform
Environment: ✅ Production ✅ Preview ✅ Development

NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
Value: sat-mock-test-platform.firebasestorage.app
Environment: ✅ Production ✅ Preview ✅ Development

NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
Value: 211898743503
Environment: ✅ Production ✅ Preview ✅ Development

NEXT_PUBLIC_FIREBASE_APP_ID
Value: 1:211898743503:web:53f1a116e898c7776c95ba
Environment: ✅ Production ✅ Preview ✅ Development

NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
Value: G-QH3FNHLTLB
Environment: ✅ Production ✅ Preview ✅ Development

NEXT_PUBLIC_APP_URL
Value: https://your-app.vercel.app
Environment: ✅ Production ✅ Preview ✅ Development
Note: Update this AFTER deployment with your actual Vercel URL
```

#### Private Variables - 3 variables

```
FIREBASE_PROJECT_ID
Value: sat-mock-test-platform
Environment: ✅ Production ✅ Preview ✅ Development

FIREBASE_CLIENT_EMAIL
Value: firebase-adminsdk-fbsvc@sat-mock-test-platform.iam.gserviceaccount.com
Environment: ✅ Production ✅ Preview ✅ Development

FIREBASE_PRIVATE_KEY
Value: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCjGBT0+d/PVorR\n+4C+kJ3YxtmR1jIASmVAU0q2eGUmESyXTQZUGLs9zEHJxyQsrl05oVahDSphu7GU\n5TmK6f/uY6wmDJTiwCaHkZrn4BPHM9qy9lvoNxBzyXcakNS8MTue0GA+a5hhTa+0\nI6FVXFzc9LPH3kjFv4ZejTxvzxrsncf9jqBBzVnFND9nOaPYyYBOfgzP2harQ1kU\nugZ3TlyUSgIyjn2xL/tI58pt7yyPoPT7UvLItpqBTVoAjC3JTA9ibsa6NrFM1Mu2\nkiogH1u20J59e3Bp6e8uVy2sKDe00hYtKV1EXVMfQ2J5Jvu1y+9KRFI2vVsngyjM\n+gvl6T7tAgMBAAECggEAAyEZ1rIw0lXd3V8QCgEnIi+Pan4bqf76Sia11T2rfk/0\ni/eje6AY2sUWbVkFb30JaWHYSSOUbDSRfYdX/Ok/IaE5B525QXSt4bg+Bh1MOZDu\nP2tz5xBERILCnbz7KtMVuGAwzbLyKaXJ+yett3cJihqA3dwhYvfyQpuINhTZLV35\nCzy//Glwa5ne7ShgPgI8D01fJ9DNwuPWOruNDVschbbjQ1vD5OpAjvaSYmwuXai9\nMF3VsbfmUvsej4nuWqqB4bfsAgj55Wcf54XMIo4a9XLV9xv5StIAUGU4U66roxZR\nDJC0X4anEBOlylILWsqhTmqIZ0RI2Su2Y/5EoZZM4QKBgQDkw2vKBvosvjE8P7p6\nrafFhkNxunFosk7dSK36GuLa/7o4dKKsBYVDqQgYyfMt8UchUYKIDnDAVfUdMKp8\nAJ+sx7f3AlmQKk2OqhH/9sJRRpyUm+6V4lzxGR6j6yxMUCFszaEhMDmeWmqOHxmJ\nLETp1O7eNEZzs/9E/1B/sFvqDQKBgQC2gxj7pE3ZCI1VwpS5il7MWSxQBlDLLS0d\nJw6+94+/RdJqZHn4ooMajT264C5aIhW+hvl+AaV6MGbz3DyLQBT7PyJFudSFK5kc\n+AdGtxixGPGbkGe6EDg829qiGiAdQz0uBJKm3q+jQfNJQmA6GQkgzUsMhx6a5ejx\nQ3RUJNfQYQKBgAYFcsfdiSY2V1trnf/upDTZxNqwep2z28mNSS8FGCWFh6RGxaVb\ne9d9En58ik8SQ7oHyDTGlIcrfAkpp8MdzRYiJ6BzymG2C1aO+WxQVWsIPcTXmd8O\nFz4tWBYecYsMrOSNQQl7mHinjphxDx4CMUoqVaM5owUWnsh1I+xIexLdAoGBAJM0\nm+LjO7LQdgZ0wbYAx8M0LUyCO4oUbu2zge4/CF7ytur/DW2fzfSNdPuUM26ZTUZ1\n4Sdjto8eGPuZZ++8iO+4lTD92E5swrsdxeigZzb38m9RgogM6v8TKH1UaxCPGfpS\nz+HtfGZGHC67bZeOd9FQI7cACIxQ4ZgumtX/PV4hAoGBAJuaNFbb5ldedw5RpHGW\nKL+LKFeBCNiCBNM5dQVRQ6TT9XfawcJYwaU3cN1RnyRDIpOqklNxN4tQYmXpTPKo\nkWAG5GvmcUEKUXdQde3HCXdTBkHuk5H3WPryn8xfmwSOpZSwcpdEz6ITsX2QwxWC\nnDSczH2twGZVln4aWwQT1QfC\n-----END PRIVATE KEY-----"
Environment: ✅ Production ✅ Preview ✅ Development
⚠️ IMPORTANT: Copy the ENTIRE value including the quotes and \n characters
```

### Step 3: Deploy

1. After adding all 11 variables, click **"Deploy"**
2. Wait 2-5 minutes
3. Note your deployment URL (e.g., `https://sat-mock-test-abc123.vercel.app`)

### Step 4: Post-Deployment (IMPORTANT!)

1. **Update NEXT_PUBLIC_APP_URL:**
   - Go to: Project → Settings → Environment Variables
   - Find `NEXT_PUBLIC_APP_URL`
   - Edit and change to your actual Vercel URL
   - Save
   - Click **"Redeploy"** on the latest deployment

2. **Add Vercel Domain to Firebase:**
   - Go to: https://console.firebase.google.com
   - Project: `sat-mock-test-platform`
   - **Authentication** → **Settings** → **Authorized domains**
   - Click **"Add domain"**
   - Add: `your-app.vercel.app` (your actual Vercel domain)
   - Click **"Add"**

### Step 5: Test

- Visit your Vercel URL
- Test Google Sign-In
- Test student dashboard
- Test admin dashboard

---

## ✅ Checklist

- [ ] All 11 environment variables added
- [ ] All variables enabled for Production, Preview, Development
- [ ] Deployed successfully
- [ ] `NEXT_PUBLIC_APP_URL` updated to actual Vercel URL
- [ ] Vercel domain added to Firebase Authorized Domains
- [ ] Redeployed after updating `NEXT_PUBLIC_APP_URL`
- [ ] Tested authentication
- [ ] Tested student dashboard
- [ ] Tested admin dashboard

---

**That's it! Your app should be live! 🎉**
