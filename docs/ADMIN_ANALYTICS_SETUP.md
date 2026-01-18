# Admin Analytics Dashboard & Email System Setup Guide

## 📊 Executive Dashboard

### Access
- **URL:** `/admin/dashboard`
- **Requirements:** Admin role required

### Features
1. **KPI Cards** - Real-time platform metrics
2. **7-Day Trend Charts** - Performance visualization
3. **Student Master Table** - Quick overview with risk levels
4. **Export Functionality** - CSV export for all data

### Key Metrics Tracked
- Total Active Students
- Total Tests Completed
- Platform Average Score
- Daily/Weekly/Monthly Active Users
- Engagement Ratios (DAU/MAU)
- Students Improving/At Risk/Excelling
- Streak Metrics

---

## 📈 Advanced Analytics

### Access
- **URL:** `/admin/analytics`
- **Tabs:**
  - **Overview:** Executive summary
  - **Student Analysis:** Individual student deep-dive
  - **Grade Analysis:** Grade-wise breakdown

### Student Analysis Features
- User search and selection
- Individual performance tracking
- Test history with detailed scores
- Learning analytics (speed vs accuracy)
- Engagement patterns
- Communication log

---

## 📧 Email System Setup

### 1. SendGrid Configuration

#### Step 1: Sign Up for SendGrid
1. Go to [sendgrid.com](https://sendgrid.com)
2. Create a free account (100 emails/day free tier)
3. Verify your email address

#### Step 2: Get API Key
1. Navigate to **Settings → API Keys**
2. Click **Create API Key**
3. Name it: `SAT Practice Platform`
4. Select **Full Access** permissions
5. Copy the API key (you'll only see it once!)

#### Step 3: Configure Environment Variables

Add to your `.env.local` file:
```bash
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or your production URL
```

#### Step 4: Verify Domain (Optional but Recommended)
1. Go to **Settings → Sender Authentication**
2. Click **Authenticate Your Domain**
3. Follow DNS setup instructions
4. This improves deliverability

---

### 2. Email Types Implemented

#### Weekly Progress Reports
- **Trigger:** Manual API call (can be scheduled via cron)
- **Endpoint:** `POST /api/admin/email/weekly-reports`
- **Frequency:** Weekly (Sunday 6 PM recommended)
- **Content:**
  - Tests completed this week
  - Average score
  - Current streak
  - Weekly highlights
  - Badges earned

#### Streak Milestone Emails
- **Trigger:** When student reaches 5, 10, 15, 20+ day streak
- **Status:** Ready for implementation (needs badge tracking)

#### Inactivity Reminders
- **Trigger:** No activity for 3, 5, 7 days
- **Status:** Ready for implementation

#### Achievement Notifications
- **Trigger:** New badge earned
- **Status:** Ready for implementation

---

### 3. Scheduling Weekly Reports

#### Option A: Cloud Scheduler (Recommended for Production)

1. **Set up Google Cloud Scheduler:**
```bash
gcloud scheduler jobs create http weekly-reports \
  --schedule="0 18 * * 0" \
  --uri="https://your-domain.com/api/admin/email/weekly-reports" \
  --http-method=POST \
  --headers="Authorization=Bearer YOUR_ADMIN_TOKEN"
```

2. **Or use a cron service like:**
   - [cron-job.org](https://cron-job.org)
   - [EasyCron](https://www.easycron.com)
   - [Vercel Cron](https://vercel.com/docs/cron-jobs) (if using Vercel)

#### Option B: Manual Trigger (For Testing)

```bash
curl -X POST https://your-domain.com/api/admin/email/weekly-reports \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

### 4. Email Preferences

#### User Access
- **URL:** `/settings/email-preferences`
- Users can toggle email types on/off
- Preferences stored in Firestore `users/{uid}/emailPreferences`

#### Default Settings
- All emails enabled by default
- Users can opt-out individually
- "Unsubscribe from All" option available

---

## 🔍 Student Risk Level Calculation

### Risk Levels

**🟢 Excellent:**
- Active in last 3 days
- Average score 70%+
- Stable or improving scores

**🟡 Good:**
- Active in last 3 days
- Average score 70%+
- Some score fluctuation

**🔴 At Risk:**
- No activity in 7+ days OR
- Average score < 50% over last 5 tests OR
- Score declining >15% over 2 weeks

### Implementation
Risk levels are calculated in `/api/admin/stats/enhanced` and displayed in:
- Executive Dashboard
- Student Master Table
- Individual Student Pages

---

## 📥 Export Functionality

### CSV Export
- **Endpoint:** `GET /api/admin/export?format=csv&type=students`
- **Types:** `students`, `attempts`, `results`
- **Usage:** Click "Export CSV" button in dashboard

### Export Options
- All students data
- Specific user's attempts/results
- Filtered data (via query parameters)

---

## 🚀 Next Steps

### Immediate Actions:
1. ✅ Set up SendGrid account
2. ✅ Add API key to `.env.local`
3. ✅ Test email sending manually
4. ✅ Set up weekly report scheduler
5. ✅ Configure email preferences page

### Future Enhancements:
- [ ] PDF export (using jsPDF or puppeteer)
- [ ] Google Sheets sync
- [ ] Calendar heatmap for engagement
- [ ] Predictive analytics (ML model)
- [ ] Automated at-risk student alerts
- [ ] Parent monthly summary emails
- [ ] Newsletter system

---

## 📝 Testing Email System

### Test Weekly Reports
```bash
# Get admin token first (from browser console after login)
const auth = getAuth();
const token = await getIdToken(auth.currentUser);

# Then call API
fetch('/api/admin/email/weekly-reports', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Check Email Logs
- Firestore collection: `emailLogs`
- Tracks: sent status, open rate, click rate
- View in admin dashboard (coming soon)

---

## 🔒 Security Notes

- All admin endpoints require authentication
- Admin role verified on every request
- Email preferences respected
- Unsubscribe links functional
- Data privacy: Students can only see own data

---

## 📞 Support

For issues or questions:
- Check Firestore logs for email errors
- Verify SendGrid API key is correct
- Check email preferences in user profile
- Review email logs collection for delivery status
