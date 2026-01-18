# 🚀 Complete Vercel Deployment Guide

This guide will walk you through deploying your SAT Practice Platform to Vercel step-by-step.

---

## 📋 Prerequisites

Before deploying, make sure you have:
- ✅ A Vercel account (sign up at https://vercel.com)
- ✅ A GitHub account (for connecting your repository)
- ✅ Your project pushed to GitHub
- ✅ All environment variables ready (see below)

---

## Step 1: Prepare Your Repository

### 1.1 Push to GitHub

If you haven't already, push your code to GitHub:

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Ready for Vercel deployment"

# Add your GitHub repository as remote
git remote add origin https://github.com/yourusername/sat-mock-test.git

# Push to GitHub
git push -u origin main
```

### 1.2 Verify .gitignore

Make sure `.env.local` is in your `.gitignore` (it should already be there):

```bash
# Check .gitignore
cat .gitignore | grep .env
```

---

## Step 2: Collect All Environment Variables

Before deploying, collect all these environment variables from your `.env.local`:

### 🔥 Firebase Client Configuration (Public - starts with NEXT_PUBLIC_)

These are safe to expose in the browser:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 🔐 Firebase Admin Configuration (Private - Server-side only)

These are secret and should NOT start with NEXT_PUBLIC_:

```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Important:** The `FIREBASE_PRIVATE_KEY` should include the `\n` characters (newlines) as they appear in your Firebase service account JSON file.

### 📧 SendGrid Configuration (Private)

```bash
SENDGRID_API_KEY=SG.your_full_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

### 🌐 Application URL (Public)

```bash
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**Note:** You'll update this after deployment with your actual Vercel URL.

### 📊 Google Sheets (Optional - if you use Google Sheets integration)

```bash
GOOGLE_SHEET_ID=your_google_sheet_id
```

---

## Step 3: Deploy to Vercel

### 3.1 Sign Up / Log In to Vercel

1. Go to: https://vercel.com
2. Click **"Sign Up"** or **"Log In"**
3. Choose **"Continue with GitHub"** (recommended)

### 3.2 Import Your Project

1. After logging in, click **"Add New..."** → **"Project"**
2. Find your repository: `yourusername/sat-mock-test`
3. Click **"Import"**

### 3.3 Configure Project Settings

Vercel will auto-detect Next.js. Configure:

- **Framework Preset:** Next.js (auto-detected)
- **Root Directory:** `./` (default)
- **Build Command:** `npm run build` (default)
- **Output Directory:** `.next` (default)
- **Install Command:** `npm install` (default)

### 3.4 Add Environment Variables

**Before clicking "Deploy", add all environment variables:**

1. Scroll down to **"Environment Variables"** section
2. Click **"Add"** for each variable

#### Add Public Variables (NEXT_PUBLIC_*):

Click "Add" and enter each:

```
Name: NEXT_PUBLIC_FIREBASE_API_KEY
Value: [paste your Firebase API key]
Environment: Production, Preview, Development (select all)
```

Repeat for:
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `NEXT_PUBLIC_APP_URL` (set to `https://your-app.vercel.app` for now, update after deployment)

#### Add Private Variables:

```
Name: FIREBASE_PROJECT_ID
Value: [your project ID]
Environment: Production, Preview, Development (select all)
```

```
Name: FIREBASE_CLIENT_EMAIL
Value: [your service account email]
Environment: Production, Preview, Development (select all)
```

```
Name: FIREBASE_PRIVATE_KEY
Value: [paste entire private key including \n characters]
Environment: Production, Preview, Development (select all)
```

**⚠️ Important for FIREBASE_PRIVATE_KEY:**
- Copy the ENTIRE key from your Firebase service account JSON
- It should look like: `"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"`
- Keep the `\n` characters - Vercel will handle them correctly

```
Name: SENDGRID_API_KEY
Value: [your SendGrid API key]
Environment: Production, Preview, Development (select all)
```

```
Name: SENDGRID_FROM_EMAIL
Value: [your verified sender email]
Environment: Production, Preview, Development (select all)
```

#### Optional: Google Sheets

```
Name: GOOGLE_SHEET_ID
Value: [your Google Sheet ID]
Environment: Production, Preview, Development (select all)
```

### 3.5 Deploy

1. After adding all environment variables, click **"Deploy"**
2. Wait for the build to complete (usually 2-5 minutes)
3. You'll see a success message with your deployment URL

---

## Step 4: Post-Deployment Configuration

### 4.1 Update NEXT_PUBLIC_APP_URL

1. After deployment, note your Vercel URL (e.g., `https://sat-mock-test.vercel.app`)
2. Go to **Project Settings** → **Environment Variables**
3. Find `NEXT_PUBLIC_APP_URL`
4. Click **"Edit"**
5. Update to your actual Vercel URL: `https://your-app.vercel.app`
6. Click **"Save"**
7. **Redeploy** the project (or push a new commit to trigger redeploy)

### 4.2 Configure Firebase Authorized Domains

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Click **"Add domain"**
5. Add your Vercel domain: `your-app.vercel.app`
6. Click **"Add"**

### 4.3 Test Your Deployment

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Test authentication (Google Sign-In)
3. Test student dashboard
4. Test admin dashboard
5. Test email sending (if configured)

---

## Step 5: Custom Domain (Optional)

### 5.1 Add Custom Domain in Vercel

1. Go to your project in Vercel
2. Click **"Settings"** → **"Domains"**
3. Enter your domain: `yourdomain.com`
4. Click **"Add"**

### 5.2 Configure DNS

Vercel will provide DNS records to add:

1. **For root domain (`yourdomain.com`):**
   - Type: `A`
   - Value: Vercel's IP address

2. **For www subdomain (`www.yourdomain.com`):**
   - Type: `CNAME`
   - Value: `cname.vercel-dns.com`

3. Add these records in your domain registrar's DNS settings
4. Wait for DNS propagation (can take up to 48 hours, usually 1-2 hours)

### 5.3 Update Environment Variables

After your custom domain is active:

1. Update `NEXT_PUBLIC_APP_URL` to: `https://yourdomain.com`
2. Add `yourdomain.com` to Firebase Authorized Domains
3. Redeploy

---

## 🔧 Troubleshooting

### Build Fails: "Missing environment variable"

**Solution:**
- Go to Vercel → Project → Settings → Environment Variables
- Make sure all required variables are added
- Check that they're enabled for the correct environment (Production/Preview/Development)
- Redeploy

### Build Fails: "Firebase initialization error"

**Solution:**
- Verify all `NEXT_PUBLIC_FIREBASE_*` variables are set correctly
- Check that `FIREBASE_PROJECT_ID` matches your Firebase project
- Ensure no extra spaces or quotes in environment variables

### Authentication Not Working

**Solution:**
1. Check Firebase Authorized Domains includes your Vercel URL
2. Verify `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` is correct
3. Check browser console for errors
4. Ensure `NEXT_PUBLIC_APP_URL` matches your actual Vercel URL

### Email Not Sending

**Solution:**
1. Verify `SENDGRID_API_KEY` is set correctly
2. Check `SENDGRID_FROM_EMAIL` is verified in SendGrid
3. Check Vercel function logs: Project → Deployments → Click deployment → Functions tab
4. Verify SendGrid API key has "Mail Send" permission

### FIREBASE_PRIVATE_KEY Error

**Solution:**
- The private key must include `\n` characters
- Copy the ENTIRE key from your Firebase service account JSON
- Don't remove quotes or escape characters
- Format should be: `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"`

### Environment Variables Not Updating

**Solution:**
- After adding/updating environment variables, you must **redeploy**
- Either push a new commit or click "Redeploy" in Vercel dashboard
- Environment variables are injected at build time

---

## 📊 Monitoring & Logs

### View Deployment Logs

1. Go to your project in Vercel
2. Click on a deployment
3. View build logs and function logs

### View Runtime Logs

1. Go to **Project** → **Deployments**
2. Click on a deployment
3. Click **"Functions"** tab
4. View API route logs

### Monitor Performance

- Vercel Analytics (if enabled)
- Firebase Console → Performance
- SendGrid Dashboard → Activity Feed

---

## 🔄 Continuous Deployment

Vercel automatically deploys when you push to GitHub:

1. **Push to `main` branch** → Deploys to Production
2. **Push to other branches** → Creates Preview deployment
3. **Create Pull Request** → Creates Preview deployment

### Manual Deployment

You can also trigger deployments manually:

1. Go to **Deployments** tab
2. Click **"Redeploy"** on any deployment
3. Or use Vercel CLI: `vercel --prod`

---

## 📝 Environment Variables Checklist

Use this checklist to ensure all variables are set:

### Public Variables (NEXT_PUBLIC_*)
- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY`
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- [ ] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_APP_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- [ ] `NEXT_PUBLIC_APP_URL` (updated after deployment)

### Private Variables
- [ ] `FIREBASE_PROJECT_ID`
- [ ] `FIREBASE_CLIENT_EMAIL`
- [ ] `FIREBASE_PRIVATE_KEY` (with `\n` characters)
- [ ] `SENDGRID_API_KEY`
- [ ] `SENDGRID_FROM_EMAIL`

### Optional
- [ ] `GOOGLE_SHEET_ID` (if using Google Sheets)

---

## 🎉 Success Checklist

After deployment, verify:

- [ ] Application loads at Vercel URL
- [ ] Google Sign-In works
- [ ] Student dashboard displays correctly
- [ ] Admin dashboard accessible
- [ ] Tests can be started and submitted
- [ ] Email sending works (test from `/admin/email`)
- [ ] Firebase data syncs correctly
- [ ] All API routes function properly

---

## 🚀 Next Steps

1. **Set up custom domain** (optional)
2. **Enable Vercel Analytics** (optional)
3. **Set up monitoring** (optional)
4. **Configure automated backups** (Firestore exports)
5. **Set up staging environment** (separate Vercel project)

---

## 📞 Need Help?

- **Vercel Docs:** https://vercel.com/docs
- **Vercel Support:** https://vercel.com/support
- **Firebase Docs:** https://firebase.google.com/docs
- **SendGrid Docs:** https://docs.sendgrid.com/

---

## ✅ Quick Deploy Command (Alternative)

If you prefer CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

Then add environment variables via Vercel dashboard.

---

**You're all set! Your SAT Practice Platform is now live on Vercel! 🎉**
