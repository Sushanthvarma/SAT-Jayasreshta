# ✅ Vercel Deployment Quick Checklist

Use this checklist during deployment to ensure nothing is missed.

---

## 📦 Pre-Deployment

- [ ] Code pushed to GitHub
- [ ] `.env.local` is in `.gitignore` (verified)
- [ ] All environment variables collected from `.env.local`
- [ ] Vercel account created (https://vercel.com)

---

## 🔑 Environment Variables to Add in Vercel

### Firebase Client (Public - NEXT_PUBLIC_*)
- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY`
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- [ ] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_APP_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- [ ] `NEXT_PUBLIC_APP_URL` (set to `https://your-app.vercel.app` initially)

### Firebase Admin (Private)
- [ ] `FIREBASE_PROJECT_ID`
- [ ] `FIREBASE_CLIENT_EMAIL`
- [ ] `FIREBASE_PRIVATE_KEY` (⚠️ includes `\n` characters)

### SendGrid (Private)
- [ ] `SENDGRID_API_KEY`
- [ ] `SENDGRID_FROM_EMAIL`

### Optional
- [ ] `GOOGLE_SHEET_ID` (if using Google Sheets)

---

## 🚀 Deployment Steps

- [ ] Import project from GitHub in Vercel
- [ ] Configure project settings (auto-detected Next.js)
- [ ] Add ALL environment variables (see above)
- [ ] Click "Deploy"
- [ ] Wait for build to complete
- [ ] Note your Vercel URL

---

## 🔧 Post-Deployment

- [ ] Update `NEXT_PUBLIC_APP_URL` to actual Vercel URL
- [ ] Add Vercel domain to Firebase Authorized Domains
- [ ] Redeploy after updating `NEXT_PUBLIC_APP_URL`
- [ ] Test authentication (Google Sign-In)
- [ ] Test student dashboard
- [ ] Test admin dashboard
- [ ] Test email sending from `/admin/email`

---

## 🎯 Testing Checklist

- [ ] Homepage loads
- [ ] Google Sign-In works
- [ ] Student can select grade
- [ ] Student can start a test
- [ ] Student can submit a test
- [ ] Admin dashboard accessible
- [ ] Admin analytics load
- [ ] Email test sends successfully
- [ ] Data syncs with Firestore

---

## 📝 Quick Reference

**Vercel Dashboard:** https://vercel.com/dashboard  
**Firebase Console:** https://console.firebase.google.com  
**SendGrid Dashboard:** https://app.sendgrid.com  

**Full Guide:** See `docs/VERCEL_DEPLOYMENT_GUIDE.md`

---

**Ready to deploy? Follow the full guide step-by-step! 🚀**
