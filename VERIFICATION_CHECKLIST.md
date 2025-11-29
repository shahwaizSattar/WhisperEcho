# Forgot Password Feature - Verification Checklist

## 🔍 Pre-Testing Checklist

### Backend Setup
- [x] ✅ nodemailer installed (`npm install` completed)
- [x] ✅ `.env` file created with credentials
- [x] ✅ MongoDB connection string configured
- [x] ✅ Brevo SMTP credentials added
- [x] ✅ JWT secret configured
- [x] ✅ Port 5000 configured

### Email Service
- [x] ✅ Email service tested (`node test-email.js`)
- [x] ✅ Test email received successfully
- [x] ✅ Brevo SMTP connection verified
- [x] ✅ From email configured

### API Endpoints
- [x] ✅ `/api/auth/forgot-password` endpoint added
- [x] ✅ `/api/auth/verify-reset-code` endpoint added
- [x] ✅ `/api/auth/reset-password` endpoint added
- [x] ✅ Routes mounted in server.js
- [x] ✅ Rate limiting applied

### Database
- [x] ✅ OTP model exists
- [x] ✅ User model has password field
- [x] ✅ MongoDB connection working
- [x] ✅ TTL index for auto-expiration

### Frontend
- [x] ✅ ForgotPasswordScreen.tsx exists
- [x] ✅ API methods in api.ts configured
- [x] ✅ Navigation setup
- [x] ✅ UI components ready

## 🧪 Testing Checklist

### 1. Email Service Test
```bash
cd backend
node test-email.js
```
- [ ] Command runs without errors
- [ ] Console shows "✅ Email sent successfully"
- [ ] Test email received in inbox
- [ ] Email formatting looks good

### 2. Backend Server Test
```bash
cd backend
npm start
```
- [ ] Server starts on port 5000
- [ ] MongoDB connection successful
- [ ] No error messages in console
- [ ] Routes loaded successfully

### 3. Forgot Password API Test

#### Step 1: Request Reset Code
```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone":"YOUR_EMAIL@example.com"}'
```
- [ ] Returns success response
- [ ] Email received with OTP code
- [ ] OTP is 6 digits
- [ ] Email template looks professional

#### Step 2: Verify Code
```bash
curl -X POST http://localhost:5000/api/auth/verify-reset-code \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone":"YOUR_EMAIL@example.com","code":"123456"}'
```
- [ ] Returns success for correct code
- [ ] Returns error for wrong code
- [ ] Attempt counter increments

#### Step 3: Reset Password
```bash
curl -X POST http://localhost:5000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone":"YOUR_EMAIL@example.com","code":"123456","newPassword":"newPass123"}'
```
- [ ] Returns success response
- [ ] Password updated in database
- [ ] OTP deleted from database
- [ ] Can login with new password

### 4. Frontend Test (Manual)

#### Start Frontend
```bash
cd frontend
npm start
```

#### Test Flow
- [ ] Navigate to Login screen
- [ ] Click "Forgot Password?" link
- [ ] See Step 1: Email input screen
- [ ] Enter email and submit
- [ ] See Step 2: OTP verification screen
- [ ] Timer starts counting down
- [ ] Enter OTP code
- [ ] See Step 3: New password screen
- [ ] Enter new password
- [ ] Submit and see success message
- [ ] Redirected to login screen
- [ ] Can login with new password

### 5. Error Handling Tests

#### Invalid Email
- [ ] Enter invalid email format
- [ ] See validation error
- [ ] Cannot submit

#### User Not Found
- [ ] Enter non-existent email
- [ ] See "User not found" error

#### Wrong OTP
- [ ] Enter incorrect code
- [ ] See "Invalid code" error
- [ ] Attempt counter increments

#### Expired OTP
- [ ] Wait 10+ minutes
- [ ] Try to verify code
- [ ] See "Expired code" error

#### Too Many Attempts
- [ ] Enter wrong code 5 times
- [ ] See "Too many attempts" error
- [ ] OTP deleted from database

#### Password Too Short
- [ ] Enter password < 6 characters
- [ ] See validation error

#### Passwords Don't Match
- [ ] Enter different passwords
- [ ] See "Passwords do not match" error

### 6. UI/UX Tests

#### Step Indicator
- [ ] Shows step 1 active initially
- [ ] Updates to step 2 after email
- [ ] Updates to step 3 after verification
- [ ] Previous steps marked as complete

#### Timer
- [ ] Starts at 10:00 (or configured time)
- [ ] Counts down properly
- [ ] Resend button disabled during countdown
- [ ] Resend button enabled after expiry

#### Loading States
- [ ] Shows spinner during API calls
- [ ] Buttons disabled during loading
- [ ] No double submissions possible

#### Animations
- [ ] Smooth transitions between steps
- [ ] Form animations work
- [ ] Success/error messages animate

#### Responsive Design
- [ ] Works on mobile devices
- [ ] Works on tablets
- [ ] Works on web
- [ ] Keyboard doesn't cover inputs

### 7. Security Tests

#### Rate Limiting
- [ ] Make 20+ requests quickly
- [ ] See rate limit error
- [ ] Wait 15 minutes
- [ ] Can make requests again

#### OTP Expiration
- [ ] OTP expires after 10 minutes
- [ ] Cannot use expired OTP
- [ ] Must request new code

#### Attempt Limiting
- [ ] Maximum 5 attempts allowed
- [ ] OTP deleted after max attempts
- [ ] Must request new code

#### Password Hashing
- [ ] Check database
- [ ] Password is hashed (not plain text)
- [ ] Uses bcrypt

## 📊 Database Verification

### Check OTP Collection
```javascript
// In MongoDB
db.otps.find({ email: "YOUR_EMAIL@example.com" })
```
- [ ] OTP record created after request
- [ ] Has correct email
- [ ] Has 6-digit code
- [ ] Has purpose: "forgot-password"
- [ ] Has expiresAt timestamp
- [ ] Deleted after successful reset

### Check User Collection
```javascript
// In MongoDB
db.users.findOne({ email: "YOUR_EMAIL@example.com" })
```
- [ ] User exists
- [ ] Password field is hashed
- [ ] Password updated after reset

## 🔧 Configuration Verification

### Environment Variables
```bash
cd backend
cat .env
```
- [ ] MONGODB_URI present
- [ ] JWT_SECRET present
- [ ] BREVO_LOGIN present
- [ ] BREVO_PASSWORD present
- [ ] BREVO_FROM_EMAIL present
- [ ] PORT=5000

### Package Dependencies
```bash
cd backend
npm list nodemailer
```
- [ ] nodemailer@^6.9.7 installed

## 📱 Cross-Platform Tests

### iOS
- [ ] Works on iOS simulator
- [ ] Works on physical iPhone
- [ ] Email input keyboard correct
- [ ] Number pad for OTP
- [ ] Password visibility toggle works

### Android
- [ ] Works on Android emulator
- [ ] Works on physical Android device
- [ ] Email input keyboard correct
- [ ] Number pad for OTP
- [ ] Password visibility toggle works

### Web
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Responsive design
- [ ] Form validation works

## 🚨 Edge Cases

### Network Issues
- [ ] Handle timeout errors
- [ ] Show appropriate error message
- [ ] Allow retry

### Multiple Requests
- [ ] Can request new code
- [ ] Old code invalidated
- [ ] New code sent

### Concurrent Sessions
- [ ] Multiple devices work
- [ ] Latest code is valid
- [ ] Old codes invalidated

### Special Characters
- [ ] Email with + works
- [ ] Email with dots works
- [ ] Password with special chars works

## 📈 Performance Tests

### Response Times
- [ ] Request reset < 2 seconds
- [ ] Verify code < 1 second
- [ ] Reset password < 2 seconds
- [ ] Email delivery < 30 seconds

### Load Testing
- [ ] Handle 10 concurrent requests
- [ ] No database locks
- [ ] No memory leaks

## 🎯 Final Verification

### Complete Flow Test
1. [ ] Start backend server
2. [ ] Start frontend app
3. [ ] Navigate to forgot password
4. [ ] Enter email
5. [ ] Receive OTP email
6. [ ] Enter OTP code
7. [ ] Set new password
8. [ ] Login with new password
9. [ ] Access account successfully

### Documentation
- [x] ✅ FORGOT_PASSWORD_FEATURE.md created
- [x] ✅ FORGOT_PASSWORD_QUICKSTART.md created
- [x] ✅ FORGOT_PASSWORD_FLOW.md created
- [x] ✅ IMPLEMENTATION_SUMMARY.md created
- [x] ✅ VERIFICATION_CHECKLIST.md created

### Code Quality
- [x] ✅ No console errors
- [x] ✅ No TypeScript errors
- [x] ✅ Proper error handling
- [x] ✅ Clean code structure
- [x] ✅ Comments added

## ✅ Sign-Off

### Developer Checklist
- [ ] All tests passed
- [ ] No critical bugs
- [ ] Documentation complete
- [ ] Code reviewed
- [ ] Ready for production

### Deployment Checklist
- [ ] Environment variables set
- [ ] Database indexes created
- [ ] Email service configured
- [ ] SSL/TLS enabled
- [ ] Monitoring setup
- [ ] Backup strategy

## 🎉 Completion Status

**Current Status**: ✅ IMPLEMENTATION COMPLETE

**Testing Status**: ⏳ READY FOR TESTING

**Production Status**: ⏳ PENDING VERIFICATION

---

## 📝 Notes

Use this checklist to systematically verify every aspect of the forgot password feature. Check off each item as you test it. If any item fails, refer to the troubleshooting section in FORGOT_PASSWORD_FEATURE.md.

**Recommended Testing Order:**
1. Email service test
2. Backend API tests
3. Database verification
4. Frontend manual test
5. Error handling tests
6. Security tests
7. Cross-platform tests
8. Complete flow test

Good luck! 🚀
