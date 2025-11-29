# Forgot Password Feature - OTP Validation

## Overview
This feature implements a secure password reset flow using OTP (One-Time Password) validation via email. Users can reset their password by receiving a 6-digit code via email.

## Features Implemented

### Backend (Node.js/Express)

#### 1. **Email Service Integration** (`backend/utils/emailService.js`)
- Configured Brevo SMTP for sending emails
- `sendPasswordResetEmail(email, otp)` - Sends OTP code to user's email
- Professional HTML email template with OTP display
- 10-minute expiration for OTP codes

#### 2. **OTP Service** (`backend/utils/otpService.js`)
- `generateOTP()` - Generates 6-digit random OTP
- `storeOTP()` - Stores OTP in database with expiration
- `verifyOTP()` - Validates OTP with attempt tracking
- Maximum 5 attempts per OTP
- Automatic cleanup of expired OTPs

#### 3. **Auth Routes** (`backend/routes/auth.js`)

##### POST `/api/auth/forgot-password`
Request password reset code
```json
{
  "emailOrPhone": "user@example.com"
}
```
Response:
```json
{
  "success": true,
  "message": "Password reset code sent to your email"
}
```

##### POST `/api/auth/verify-reset-code`
Verify the OTP code
```json
{
  "emailOrPhone": "user@example.com",
  "code": "123456"
}
```
Response:
```json
{
  "success": true,
  "message": "Code verified successfully"
}
```

##### POST `/api/auth/reset-password`
Reset password with verified code
```json
{
  "emailOrPhone": "user@example.com",
  "code": "123456",
  "newPassword": "newSecurePassword123"
}
```
Response:
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

#### 4. **OTP Model** (`backend/models/OTP.js`)
- Stores OTP with email, purpose, and expiration
- Tracks verification attempts
- Auto-expires after 10 minutes
- Supports multiple purposes (signup, forgot-password)

### Frontend (React Native/Expo)

#### 1. **Forgot Password Screen** (`frontend/src/screens/auth/ForgotPasswordScreen.tsx`)
- **Step 1: Email Input** - User enters email or phone
- **Step 2: OTP Verification** - User enters 6-digit code
- **Step 3: New Password** - User sets new password
- Beautiful step indicator showing progress
- Countdown timer for code expiration
- Resend code functionality
- Form validation with error messages
- Animated transitions between steps

#### 2. **API Integration** (`frontend/src/services/api.ts`)
Already configured with three endpoints:
- `authAPI.requestPasswordReset(emailOrPhone)`
- `authAPI.verifyResetCode(emailOrPhone, code)`
- `authAPI.resetPassword(emailOrPhone, code, newPassword)`

## Environment Variables

### Backend `.env` Configuration
```env
# Brevo SMTP (for email services)
BREVO_LOGIN=9cb06c001@smtp-brevo.com
BREVO_PASSWORD=x7DJvbrpf4KawV6T
BREVO_FROM_EMAIL=mindsetmagic30@gmail.com

# Password Reset
PASSWORD_RESET_REDIRECT=http://localhost:3000/reset-password

# Database
MONGODB_URI=mongodb+srv://uzairhussain2002_db_user:JrYk1IpBqwDZQanb@cluster0.zkicmmb.mongodb.net/anonymous_social?retryWrites=true&w=majority

# JWT
JWT_SECRET=mySecretKey
JWT_EXPIRES_IN=7d

# Server
PORT=5000
NODE_ENV=development
```

## Testing

### 1. Test Email Service
```bash
cd backend
node test-email.js
```

### 2. Test Forgot Password Flow
```bash
# Start the backend server
cd backend
npm start

# In another terminal, test the flow
node test-forgot-password.js

# After receiving OTP in email, verify it
node test-forgot-password.js verify user@example.com 123456

# Reset password
node test-forgot-password.js reset user@example.com 123456 newPassword123
```

### 3. Test from Frontend
1. Start the backend: `cd backend && npm start`
2. Start the frontend: `cd frontend && npm start`
3. Navigate to Login screen
4. Click "Forgot Password?"
5. Follow the 3-step process

## Security Features

1. **OTP Expiration**: Codes expire after 10 minutes
2. **Attempt Limiting**: Maximum 5 verification attempts per OTP
3. **Rate Limiting**: Auth endpoints limited to 20 requests per 15 minutes
4. **Secure Password Storage**: Passwords hashed with bcrypt
5. **Email Validation**: Validates email format before sending OTP
6. **Code Cleanup**: Expired OTPs automatically deleted from database

## User Flow

```
1. User clicks "Forgot Password" on login screen
   ↓
2. User enters email/phone
   ↓
3. System sends 6-digit OTP to email
   ↓
4. User enters OTP code
   ↓
5. System verifies OTP (max 5 attempts)
   ↓
6. User enters new password
   ↓
7. System updates password and deletes OTP
   ↓
8. User redirected to login screen
```

## Error Handling

### Backend Errors
- Invalid email/phone: `404 - User not found`
- Invalid OTP: `400 - Invalid code`
- Expired OTP: `400 - Invalid or expired code`
- Too many attempts: `400 - Too many attempts. Please request a new code.`
- Password too short: `400 - Password must be at least 6 characters`

### Frontend Validation
- Email format validation
- OTP length validation (4-6 digits)
- Password length validation (min 6 characters)
- Password confirmation matching
- Real-time error display

## Database Schema

### OTP Collection
```javascript
{
  email: String,           // User's email
  otp: String,            // 6-digit code
  purpose: String,        // 'forgot-password' or 'signup'
  attempts: Number,       // Verification attempts (max 5)
  maxAttempts: Number,    // Maximum allowed attempts
  isVerified: Boolean,    // Whether OTP was verified
  expiresAt: Date,        // Expiration timestamp
  createdAt: Date         // Creation timestamp
}
```

## API Response Examples

### Success Response
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Invalid or expired code"
}
```

## Installation Steps

1. **Install Dependencies**
```bash
cd backend
npm install
```

2. **Configure Environment**
- Copy `.env.example` to `.env`
- Update with your Brevo SMTP credentials
- Update MongoDB connection string

3. **Start Backend**
```bash
cd backend
npm start
```

4. **Test Email Service**
```bash
node test-email.js
```

## Troubleshooting

### Email Not Sending
- Check Brevo credentials in `.env`
- Verify Brevo account is active
- Check spam folder
- Run `node test-email.js` to test connection

### OTP Not Working
- Check MongoDB connection
- Verify OTP hasn't expired (10 min limit)
- Check attempt count (max 5 attempts)
- Look at backend console logs

### Frontend Not Connecting
- Verify backend is running on port 5000
- Check API base URL in `frontend/src/services/api.ts`
- For physical devices, update `YOUR_COMPUTER_IP` in api.ts

## Next Steps

1. ✅ Backend OTP validation implemented
2. ✅ Email service configured
3. ✅ Frontend screens created
4. ✅ API integration complete
5. 🔄 Test with real users
6. 🔄 Monitor email delivery rates
7. 🔄 Add SMS OTP option (optional)

## Support

For issues or questions:
1. Check backend console logs
2. Verify environment variables
3. Test email service independently
4. Check MongoDB connection
5. Review API response errors
