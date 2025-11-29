const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback-secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Validation middleware
const validateSignup = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('username').isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
  body('preferences').exists().withMessage('Preferences are required')
];

const validateLogin = [
  body('identifier').optional().isString().trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

// POST /api/auth/signup
router.post('/signup', validateSignup, async (req, res) => {
  console.log("Signup route hit"); // 🔹 debug
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    let { email, phone, password, username, preferences, avatar } = req.body;

    // Ensure preferences is array
    if (!Array.isArray(preferences)) preferences = [preferences];
    preferences = preferences.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());

    // Check if user already exists
    const queryConditions = [{ email }, { username }];
    if (phone) {
      queryConditions.push({ phone });
    }
    const existingUser = await User.findOne({ $or: queryConditions });
    if (existingUser) {
      let field = 'email';
      if (existingUser.username === username) field = 'username';
      if (phone && existingUser.phone === phone) field = 'phone';
      return res.status(400).json({ success: false, message: `User with this ${field} already exists` });
    }

    const user = new User({ email, phone, password, username, preferences, avatar: avatar || null, badges: [{ name: 'Welcome Aboard!', icon: '🎉', earnedAt: new Date() }] });

    await user.save();

    const token = generateToken(user._id);
    const userData = user.toObject();
    delete userData.password;

    console.log("Signup successful for:", email); // 🔹 debug

    res.status(201).json({ success: true, message: 'User created successfully', token, user: userData });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Server error during signup', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

// POST /api/auth/login
router.post('/login', validateLogin, async (req, res) => {
  console.log("Login route hit"); // 🔹 debug
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { email, identifier, password } = req.body;
    const lookup = identifier || email;
    if (!lookup) return res.status(400).json({ success: false, message: 'Email or username is required' });
    const user = await User.findOne({ $or: [{ email: lookup }, { username: lookup }] });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid email or password' });

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) return res.status(400).json({ success: false, message: 'Invalid email or password' });

    await user.updateLastActive();

    const token = generateToken(user._id);
    const userData = user.toObject();
    delete userData.password;

    console.log("Login successful for:", email); // 🔹 debug

    res.json({ success: true, message: 'Login successful', token, user: userData });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

// POST /api/auth/verify-token
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token is required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, message: 'Token is valid', user });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') return res.status(401).json({ success: false, message: 'Invalid token' });
    if (error.name === 'TokenExpiredError') return res.status(401).json({ success: false, message: 'Token expired' });
    console.error('Token verification error:', error);
    res.status(500).json({ success: false, message: 'Server error during token verification' });
  }
});

// POST /api/auth/refresh-token
// Lightweight refresh endpoint implied by authAPI.refreshToken.
// It verifies the provided token and issues a new one with the same userId payload.
router.post('/refresh-token', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const newToken = generateToken(user._id);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      token: newToken,
      user,
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    console.error('Token refresh error:', error);
    res.status(500).json({ success: false, message: 'Server error during token refresh' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { emailOrPhone } = req.body;
    
    if (!emailOrPhone) {
      return res.status(400).json({ success: false, message: 'Email or phone is required' });
    }

    // Find user by email or phone
    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Generate OTP
    const { generateOTP } = require('../utils/otpService');
    const { sendPasswordResetEmail } = require('../utils/emailService');
    const OTP = require('../models/OTP');

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing OTP for this email
    await OTP.deleteMany({ email: user.email, purpose: 'forgot-password' });

    // Create new OTP
    await OTP.create({
      email: user.email,
      otp,
      purpose: 'forgot-password',
      expiresAt
    });

    // Send OTP email
    await sendPasswordResetEmail(user.email, otp);

    console.log('Password reset OTP sent to:', user.email);

    res.json({
      success: true,
      message: 'Password reset code sent to your email'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reset code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/auth/verify-reset-code
router.post('/verify-reset-code', async (req, res) => {
  try {
    const { emailOrPhone, code } = req.body;

    if (!emailOrPhone || !code) {
      return res.status(400).json({ success: false, message: 'Email and code are required' });
    }

    // Find user
    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const OTP = require('../models/OTP');

    // Find OTP
    const otpRecord = await OTP.findOne({
      email: user.email,
      purpose: 'forgot-password',
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired code' });
    }

    // Check attempts
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ success: false, message: 'Too many attempts. Please request a new code.' });
    }

    // Verify OTP
    if (otpRecord.otp !== code) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({ success: false, message: 'Invalid code' });
    }

    // Mark as verified
    otpRecord.isVerified = true;
    await otpRecord.save();

    res.json({
      success: true,
      message: 'Code verified successfully'
    });
  } catch (error) {
    console.error('Verify reset code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { emailOrPhone, code, newPassword } = req.body;

    if (!emailOrPhone || !code || !newPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Find user
    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const OTP = require('../models/OTP');

    // Find verified OTP
    const otpRecord = await OTP.findOne({
      email: user.email,
      otp: code,
      purpose: 'forgot-password',
      isVerified: true,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired code. Please verify the code first.' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Delete OTP
    await OTP.deleteOne({ _id: otpRecord._id });

    console.log('Password reset successful for:', user.email);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
