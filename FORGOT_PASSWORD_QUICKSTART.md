# Forgot Password - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Setup
The `.env` file is already configured with your credentials:
- ✅ MongoDB Atlas connection
- ✅ Brevo SMTP credentials
- ✅ JWT secret
- ✅ Server port (5000)

### 3. Start Backend
```bash
cd backend
npm start
```

You should see:
```
✅ MongoDB Atlas connected successfully!
🚀 Server running on port 5000
```

### 4. Test Email Service
```bash
cd backend
node test-email.js
```

Expected output:
```
✅ Email sent successfully!
```

## 📱 Using the Feature

### From the App:

1. **Open Login Screen**
2. **Click "Forgot Password?"**
3. **Enter your email** (must be registered)
4. **Check your email** for 6-digit code
5. **Enter the code** in the app
6. **Set new password**
7. **Login with new password**

### Testing the API Directly:

```bash
# Step 1: Request reset code
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone":"your-email@example.com"}'

# Step 2: Verify code (check your email for the code)
curl -X POST http://localhost:5000/api/auth/verify-reset-code \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone":"your-email@example.com","code":"123456"}'

# Step 3: Reset password
curl -X POST http://localhost:5000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone":"your-email@example.com","code":"123456","newPassword":"newPass123"}'
```

## 🔍 Verification Checklist

- [ ] Backend starts without errors
- [ ] MongoDB connection successful
- [ ] Email test passes
- [ ] Can request password reset
- [ ] Email received with OTP code
- [ ] Can verify OTP code
- [ ] Can reset password
- [ ] Can login with new password

## ⚡ Key Features

- **6-digit OTP** sent via email
- **10-minute expiration** for security
- **5 attempt limit** to prevent brute force
- **Beautiful UI** with step indicator
- **Countdown timer** showing time remaining
- **Resend code** functionality
- **Real-time validation** with error messages

## 🛠️ Troubleshooting

### Email not received?
1. Check spam folder
2. Verify email exists in database
3. Run `node test-email.js` to test email service
4. Check backend console for errors

### OTP not working?
1. Code expires after 10 minutes
2. Maximum 5 attempts allowed
3. Check backend logs for errors
4. Verify MongoDB connection

### Frontend not connecting?
1. Backend must be running on port 5000
2. Check `frontend/src/services/api.ts` for correct URL
3. For physical devices, update IP address in api.ts

## 📧 Email Configuration

Your Brevo SMTP is already configured:
- **Login**: 9cb06c001@smtp-brevo.com
- **From Email**: mindsetmagic30@gmail.com
- **Server**: smtp-relay.brevo.com:587

## 🎯 What's New

### Backend Changes:
- ✅ Added `/api/auth/forgot-password` endpoint
- ✅ Added `/api/auth/verify-reset-code` endpoint
- ✅ Added `/api/auth/reset-password` endpoint
- ✅ Updated email service to send OTP codes
- ✅ Added nodemailer dependency

### Frontend Changes:
- ✅ Already has `ForgotPasswordScreen.tsx` with 3-step flow
- ✅ Already has API integration in `api.ts`
- ✅ Beautiful UI with animations and validation

### Environment:
- ✅ Added Brevo SMTP configuration
- ✅ Added password reset redirect URL
- ✅ Updated `.env.example` with new variables

## 📝 Next Steps

1. **Test the complete flow** from the app
2. **Verify email delivery** to different email providers
3. **Test error scenarios** (wrong code, expired code, etc.)
4. **Monitor backend logs** for any issues
5. **Consider adding SMS OTP** as alternative (optional)

## 🎉 You're All Set!

The forgot password feature is now fully integrated and ready to use. Users can securely reset their passwords using OTP codes sent to their email.
