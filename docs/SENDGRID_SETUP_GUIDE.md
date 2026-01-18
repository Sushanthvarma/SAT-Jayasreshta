# SendGrid Email Setup Guide - Step by Step

## 📧 Complete SendGrid Configuration Tutorial

This guide will walk you through setting up SendGrid for the SAT Practice Platform email system.

---

## Step 1: Sign Up for SendGrid Account

1. **Go to SendGrid Website:**
   - Visit: https://signup.sendgrid.com/
   - Click "Start for Free"

2. **Create Your Account:**
   - Enter your email address
   - Create a password
   - Fill in your name and company (optional)
   - Accept terms and conditions
   - Click "Create Account"

3. **Verify Your Email:**
   - Check your email inbox
   - Click the verification link from SendGrid
   - Complete the email verification

4. **Complete Onboarding:**
   - SendGrid will ask a few questions (optional)
   - You can skip most of these for now
   - Click "Get Started" or "Skip"

---

## Step 2: Get Your API Key

1. **Navigate to API Keys:**
   - Once logged in, go to: https://app.sendgrid.com/settings/api_keys
   - Or: Click **Settings** (gear icon) → **API Keys**

2. **Create a New API Key:**
   - Click the **"Create API Key"** button (top right)
   - Choose **"Full Access"** (recommended for testing)
     - Or select **"Restricted Access"** and enable:
       - Mail Send permissions
       - Stats Read permissions
   - Give it a name: `SAT Practice Platform`
   - Click **"Create & View"**

3. **Copy Your API Key:**
   - ⚠️ **IMPORTANT:** You'll only see this key once!
   - Copy the entire API key (starts with `SG.`)
   - Example: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Save it somewhere safe (password manager, notes, etc.)

---

## Step 3: Set Up Sender Email

### Option A: Use SendGrid's Default Sender (Quick Start)

1. **Go to Sender Authentication:**
   - Navigate to: https://app.sendgrid.com/settings/sender_auth
   - Or: **Settings** → **Sender Authentication**

2. **Verify Single Sender:**
   - Click **"Verify a Single Sender"**
   - Fill in the form:
     - **From Email Address:** Your email (e.g., `noreply@yourdomain.com` or use your personal email for testing)
     - **From Name:** `SAT Practice Platform`
     - **Reply To:** Your email
     - **Company Address:** Your address
   - Click **"Create"**

3. **Verify Email:**
   - Check your email inbox
   - Click the verification link from SendGrid
   - Your sender is now verified!

### Option B: Verify Your Domain (Recommended for Production)

1. **Go to Domain Authentication:**
   - Navigate to: **Settings** → **Sender Authentication** → **Authenticate Your Domain**

2. **Add Your Domain:**
   - Enter your domain (e.g., `yourdomain.com`)
   - Select your DNS provider
   - Click **"Next"**

3. **Add DNS Records:**
   - SendGrid will provide DNS records (CNAME records)
   - Add these to your domain's DNS settings
   - Wait for DNS propagation (can take up to 48 hours, usually 1-2 hours)

4. **Verify Domain:**
   - Once DNS records are added, click **"Verify"** in SendGrid
   - Status will show "Verified" when complete

---

## Step 4: Configure Environment Variables

1. **Locate Your `.env.local` File:**
   - In your project root: `c:\Users\Admin\sat-mock-test\.env.local`
   - If it doesn't exist, create it

2. **Add SendGrid Configuration:**
   Open `.env.local` and add:

   ```bash
   # SendGrid Email Configuration
   SENDGRID_API_KEY=SG.your_actual_api_key_here
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

   **Replace:**
   - `SG.your_actual_api_key_here` with the API key you copied in Step 2
   - `noreply@yourdomain.com` with your verified sender email from Step 3
   - `http://localhost:3000` with your production URL when deploying (e.g., `https://yourdomain.com`)

3. **Example `.env.local` file:**
   ```bash
   # Firebase Configuration (existing)
   FIREBASE_API_KEY=...
   FIREBASE_AUTH_DOMAIN=...
   # ... other Firebase vars ...

   # SendGrid Email Configuration (new)
   SENDGRID_API_KEY=SG.abc123xyz789...your_full_key_here
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Save the File:**
   - Make sure `.env.local` is saved
   - ⚠️ **Never commit `.env.local` to git!** (It should be in `.gitignore`)

---

## Step 5: Restart Your Development Server

After adding environment variables:

1. **Stop your Next.js server** (if running):
   - Press `Ctrl+C` in the terminal

2. **Start it again:**
   ```bash
   npm run dev
   ```

   Environment variables are loaded when the server starts, so you need to restart.

---

## Step 6: Test Email Sending

1. **Go to Email Management Page:**
   - Navigate to: http://localhost:3000/admin/email
   - Make sure you're logged in as admin

2. **Send a Test Email:**
   - In the "Test Email System" section
   - Enter your email address
   - Select "Simple Test" or "Weekly Report"
   - Click "Send Test Email"

3. **Check Your Inbox:**
   - Check your email (including spam folder)
   - You should receive the test email within a few seconds

4. **Verify It Works:**
   - If you receive the email: ✅ Success! SendGrid is configured correctly
   - If you see an error: Check the error message and troubleshoot (see below)

---

## 🔧 Troubleshooting

### Error: "SendGrid not configured"
**Solution:** 
- Make sure `.env.local` exists and has `SENDGRID_API_KEY`
- Restart your development server after adding the key
- Check that the API key starts with `SG.`

### Error: "Invalid API Key"
**Solution:**
- Verify you copied the entire API key (they're very long)
- Make sure there are no extra spaces or line breaks
- Try creating a new API key in SendGrid

### Error: "Sender email not verified"
**Solution:**
- Go to SendGrid → Settings → Sender Authentication
- Make sure your sender email is verified (green checkmark)
- For testing, you can use your personal email address

### Email Not Received
**Check:**
1. **Spam Folder:** Check your spam/junk folder
2. **SendGrid Activity:** Go to SendGrid → Activity Feed to see if email was sent
3. **Email Logs:** Check Firestore `emailLogs` collection for status
4. **API Key Permissions:** Make sure API key has "Mail Send" permission

### Rate Limits
**Free Tier Limits:**
- 100 emails per day (free tier)
- If you hit the limit, wait 24 hours or upgrade your plan

---

## 📊 Monitoring Email Delivery

### SendGrid Dashboard:
1. Go to: https://app.sendgrid.com/
2. Check **Activity Feed** to see:
   - Emails sent
   - Delivery status
   - Bounces
   - Opens and clicks

### Firestore Email Logs:
- Collection: `emailLogs`
- Contains: Status, timestamps, errors
- View in Firebase Console

---

## 🚀 Production Deployment

When deploying to production (Vercel, Netlify, etc.):

1. **Add Environment Variables in Hosting Platform:**
   - Go to your hosting platform's dashboard
   - Navigate to **Settings** → **Environment Variables**
   - Add:
     - `SENDGRID_API_KEY` = your API key
     - `SENDGRID_FROM_EMAIL` = your verified sender email
     - `NEXT_PUBLIC_APP_URL` = your production URL

2. **Update NEXT_PUBLIC_APP_URL:**
   ```bash
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```

3. **Redeploy:**
   - After adding environment variables, redeploy your application
   - The new variables will be available to your app

---

## ✅ Quick Checklist

- [ ] SendGrid account created and verified
- [ ] API key created and copied
- [ ] Sender email verified (single sender or domain)
- [ ] `.env.local` file created with API key
- [ ] `SENDGRID_FROM_EMAIL` set to verified email
- [ ] Development server restarted
- [ ] Test email sent successfully
- [ ] Email received in inbox

---

## 📞 Need Help?

- **SendGrid Support:** https://support.sendgrid.com/
- **SendGrid Docs:** https://docs.sendgrid.com/
- **API Reference:** https://docs.sendgrid.com/api-reference

---

## 🎉 You're All Set!

Once configured, you can:
- ✅ Send test emails from `/admin/email`
- ✅ Send weekly reports to all students
- ✅ Send inactivity reminders
- ✅ Track email delivery in SendGrid dashboard

Happy emailing! 📧
