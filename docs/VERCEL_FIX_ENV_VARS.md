# 🔧 Fix Environment Variables for Production

## ⚠️ Critical Issue Found

Your environment variables are currently set to **"All Pre-Production Environments"** which means they're **NOT available for Production deployments**.

## ✅ Quick Fix Steps

### Step 1: Update Existing Variables to Include Production

For each of the 6 variables you've already added:

1. Click on the variable name (or the three dots menu)
2. Click **"Edit"**
3. In the "Environment" section, make sure **"Production"** is checked
4. Click **"Save"**

**Variables to update:**
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### Step 2: Add Missing Variables

You still need to add these 5 variables:

#### 1. `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- **Value:** `G-QH3FNHLTLB`
- **Environment:** ✅ Production ✅ Preview ✅ Development

#### 2. `NEXT_PUBLIC_APP_URL`
- **Value:** `https://your-app.vercel.app` (update after deployment)
- **Environment:** ✅ Production ✅ Preview ✅ Development

#### 3. `FIREBASE_PROJECT_ID`
- **Value:** `sat-mock-test-platform`
- **Environment:** ✅ Production ✅ Preview ✅ Development

#### 4. `FIREBASE_CLIENT_EMAIL`
- **Value:** `firebase-adminsdk-fbsvc@sat-mock-test-platform.iam.gserviceaccount.com`
- **Environment:** ✅ Production ✅ Preview ✅ Development

#### 5. `FIREBASE_PRIVATE_KEY` ⚠️ MOST IMPORTANT
- **Value:** `"-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCjGBT0+d/PVorR\n+4C+kJ3YxtmR1jIASmVAU0q2eGUmESyXTQZUGLs9zEHJxyQsrl05oVahDSphu7GU\n5TmK6f/uY6wmDJTiwCaHkZrn4BPHM9qy9lvoNxBzyXcakNS8MTue0GA+a5hhTa+0\nI6FVXFzc9LPH3kjFv4ZejTxvzxrsncf9jqBBzVnFND9nOaPYyYBOfgzP2harQ1kU\nugZ3TlyUSgIyjn2xL/tI58pt7yyPoPT7UvLItpqBTVoAjC3JTA9ibsa6NrFM1Mu2\nkiogH1u20J59e3Bp6e8uVy2sKDe00hYtKV1EXVMfQ2J5Jvu1y+9KRFI2vVsngyjM\n+gvl6T7tAgMBAAECggEAAyEZ1rIw0lXd3V8QCgEnIi+Pan4bqf76Sia11T2rfk/0\ni/eje6AY2sUWbVkFb30JaWHYSSOUbDSRfYdX/Ok/IaE5B525QXSt4bg+Bh1MOZDu\nP2tz5xBERILCnbz7KtMVuGAwzbLyKaXJ+yett3cJihqA3dwhYvfyQpuINhTZLV35\nCzy//Glwa5ne7ShgPgI8D01fJ9DNwuPWOruNDVschbbjQ1vD5OpAjvaSYmwuXai9\nMF3VsbfmUvsej4nuWqqB4bfsAgj55Wcf54XMIo4a9XLV9xv5StIAUGU4U66roxZR\nDJC0X4anEBOlylILWsqhTmqIZ0RI2Su2Y/5EoZZM4QKBgQDkw2vKBvosvjE8P7p6\nrafFhkNxunFosk7dSK36GuLa/7o4dKKsBYVDqQgYyfMt8UchUYKIDnDAVfUdMKp8\nAJ+sx7f3AlmQKk2OqhH/9sJRRpyUm+6V4lzxGR6j6yxMUCFszaEhMDmeWmqOHxmJ\nLETp1O7eNEZzs/9E/1B/sFvqDQKBgQC2gxj7pE3ZCI1VwpS5il7MWSxQBlDLLS0d\nJw6+94+/RdJqZHn4ooMajT264C5aIhW+hvl+AaV6MGbz3DyLQBT7PyJFudSFK5kc\n+AdGtxixGPGbkGe6EDg829qiGiAdQz0uBJKm3q+jQfNJQmA6GQkgzUsMhx6a5ejx\nQ3RUJNfQYQKBgAYFcsfdiSY2V1trnf/upDTZxNqwep2z28mNSS8FGCWFh6RGxaVb\ne9d9En58ik8SQ7oHyDTGlIcrfAkpp8MdzRYiJ6BzymG2C1aO+WxQVWsIPcTXmd8O\nFz4tWBYecYsMrOSNQQl7mHinjphxDx4CMUoqVaM5owUWnsh1I+xIexLdAoGBAJM0\nm+LjO7LQdgZ0wbYAx8M0LUyCO4oUbu2zge4/CF7ytur/DW2fzfSNdPuUM26ZTUZ1\n4Sdjto8eGPuZZ++8iO+4lTD92E5swrsdxeigZzb38m9RgogM6v8TKH1UaxCPGfpS\nz+HtfGZGHC67bZeOd9FQI7cACIxQ4ZgumtX/PV4hAoGBAJuaNFbb5ldedw5RpHGW\nKL+LKFeBCNiCBNM5dQVRQ6TT9XfawcJYwaU3cN1RnyRDIpOqklNxN4tQYmXpTPKo\nkWAG5GvmcUEKUXdQde3HCXdTBkHuk5H3WPryn8xfmwSOpZSwcpdEz6ITsX2QwxWC\nnDSczH2twGZVln4aWwQT1QfC\n-----END PRIVATE KEY-----"`
- **Environment:** ✅ Production ✅ Preview ✅ Development
- **⚠️ CRITICAL:** Copy the ENTIRE value including the quotes and `\n` characters

### Step 3: Trigger Deployment

After fixing all variables:

1. Go to **"Deployments"** tab
2. If there's a failed deployment, click **"Redeploy"**
3. Or push a new commit to trigger automatic deployment:
   ```bash
   git commit --allow-empty -m "Trigger Vercel deployment"
   git push origin main
   ```

## ✅ Final Checklist

- [ ] All 6 existing variables updated to include Production
- [ ] `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` added
- [ ] `NEXT_PUBLIC_APP_URL` added
- [ ] `FIREBASE_PROJECT_ID` added
- [ ] `FIREBASE_CLIENT_EMAIL` added
- [ ] `FIREBASE_PRIVATE_KEY` added (with quotes and `\n`)
- [ ] All 11 variables have Production, Preview, Development enabled
- [ ] Deployment triggered

---

**After deployment succeeds, don't forget to:**
1. Update `NEXT_PUBLIC_APP_URL` with your actual Vercel URL
2. Add Vercel domain to Firebase Authorized Domains
3. Redeploy
