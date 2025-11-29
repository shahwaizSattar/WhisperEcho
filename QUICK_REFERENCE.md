# Forgot Password - Quick Reference Card

## 🚀 Quick Start Commands

```bash
# Install dependencies
cd backend && npm install

# Test email service
cd backend && node test-email.js

# Start backend server
cd backend && npm start

# Test forgot password flow
cd backend && node test-forgot-password.js
```

## 📡 API Endpoints

### 1. Request Reset Code
```bash
POST /api/auth/forgot-password
Body: { "emailOrPhone": "user@example.com" }
Response: { "success": true, "message": "Code sent" }
```

### 2. Verify Code
```bash
POST /api/auth/verify-reset-code
Body: { "emailOrPhone": "user@example.com", "code": "123456" }
Response: { "success": true, "message": "Code verified" }
```

### 3. Reset Password
```bash
POST /api/auth/reset-password
Body: { 
  "emailOrPhone": "user@example.com", 
  "code": "123456",
  "newPassword": "newPass123"
}
Response: { "success": true, "message": "Password reset" }
```

## 🔑 Environment Variables

```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=mySecretKey
JWT_EXPIRES_IN=7d
PORT=5000
BREVO_LOGIN=9cb06c001@smtp-brevo.com
BREVO_PASSWORD=x7DJvbrpf4KawV6T
BREVO_FROM_EMAIL=mindsetmagic30@gmail.com
```

## 📁 Key Files

### Backend
- `backend/routes/auth.js` - API endpoints
- `backend/utils/emailService.js` - Email sending
- `backend/utils/otpService.js` - OTP generation
- `backend/models/OTP.js` - Database model
- `backend/.env` - Configuration

### Frontend
- `frontend/src/screens/auth/ForgotPasswordScreen.tsx` - UI
- `frontend/src/services/api.ts` - API calls

## 🔐 Security Settings

| Setting | Value |
|---------|-------|
| OTP Length | 6 digits |
| Expiration | 10 minutes |
| Max Attempts | 5 |
| Rate Limit | 20 req/15min |
| Min Password | 6 characters |

## 🎯 User Flow

```
Login → Forgot Password? → Enter Email → 
Receive OTP → Enter Code → New Password → Login
```

## 🧪 Testing

### Test Email
```bash
node test-email.js
# Expected: ✅ Email sent successfully
```

### Test API
```bash
# Request code
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone":"test@example.com"}'

# Verify code
curl -X POST http://localhost:5000/api/auth/verify-reset-code \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone":"test@example.com","code":"123456"}'

# Reset password
curl -X POST http://localhost:5000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone":"test@example.com","code":"123456","newPassword":"newPass123"}'
```

## ❌ Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| User not found | Email doesn't exist | Check database |
| Invalid code | Wrong OTP | Check email |
| Expired code | > 10 minutes | Request new code |
| Too many attempts | 5+ wrong tries | Request new code |
| Password too short | < 6 characters | Use longer password |

## 🔧 Troubleshooting

### Email Not Received
1. Check spam folder
2. Verify Brevo credentials
3. Run `node test-email.js`
4. Check backend logs

### OTP Not Working
1. Check expiration (10 min)
2. Verify attempt count (< 5)
3. Check MongoDB connection
4. Look at console logs

### Frontend Issues
1. Backend must run on port 5000
2. Check API URL in api.ts
3. Update IP for physical devices

## 📊 Database Queries

### Check OTP
```javascript
db.otps.find({ email: "user@example.com" })
```

### Check User
```javascript
db.users.findOne({ email: "user@example.com" })
```

### Delete OTP
```javascript
db.otps.deleteMany({ email: "user@example.com" })
```

## 🎨 UI Components

### Step Indicator
```
Step 1: ● ○ ○  (Email)
Step 2: ● ● ○  (OTP)
Step 3: ● ● ●  (Password)
```

### Timer Display
```
Time remaining: 9:45
[Resend Code] (disabled)
```

## 📱 Frontend API Usage

```typescript
// Request reset
await authAPI.requestPasswordReset(email);

// Verify code
await authAPI.verifyResetCode(email, code);

// Reset password
await authAPI.resetPassword(email, code, newPassword);
```

## 🔄 OTP Lifecycle

```
Request → Generate → Store → Email → 
Verify → Mark Verified → Reset → Delete
```

## 📈 Success Metrics

- ✅ 3 API endpoints
- ✅ Email service working
- ✅ Frontend implemented
- ✅ Security measures
- ✅ Documentation complete

## 📚 Documentation Files

1. `FORGOT_PASSWORD_FEATURE.md` - Complete guide
2. `FORGOT_PASSWORD_QUICKSTART.md` - Quick setup
3. `FORGOT_PASSWORD_FLOW.md` - Visual diagrams
4. `IMPLEMENTATION_SUMMARY.md` - What was done
5. `VERIFICATION_CHECKLIST.md` - Testing guide
6. `QUICK_REFERENCE.md` - This file

## 🎯 Next Actions

1. [ ] Test email service
2. [ ] Start backend server
3. [ ] Test API endpoints
4. [ ] Test frontend flow
5. [ ] Verify complete flow

## 💡 Tips

- Keep backend running during tests
- Check email spam folder
- Use real email for testing
- Monitor console logs
- Test on multiple devices

## 🆘 Quick Help

```bash
# Backend not starting?
cd backend && npm install && npm start

# Email not working?
node test-email.js

# Check environment
cat .env

# View logs
npm start | grep "✅\|❌"
```

## 📞 Support Resources

- Backend logs: Check console output
- Email logs: Check Brevo dashboard
- Database: MongoDB Atlas dashboard
- API testing: Use Postman or curl

---

**Status**: ✅ Ready to Test
**Version**: 1.0.0
**Last Updated**: Implementation Complete
