require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testForgotPasswordFlow() {
  console.log('🧪 Testing Forgot Password Flow...\n');

  try {
    // Step 1: Request password reset
    console.log('📧 Step 1: Requesting password reset code...');
    const resetResponse = await axios.post(`${BASE_URL}/auth/forgot-password`, {
      emailOrPhone: 'test@example.com' // Replace with a real email from your database
    });
    console.log('✅ Reset code sent:', resetResponse.data);

    // Step 2: Verify code (you'll need to check your email for the actual code)
    console.log('\n🔐 Step 2: Verifying reset code...');
    console.log('⚠️  Check your email for the OTP code and enter it manually');
    console.log('Example: node test-forgot-password.js verify test@example.com 123456');

    // Step 3: Reset password (after verification)
    console.log('\n🔑 Step 3: Resetting password...');
    console.log('Example: node test-forgot-password.js reset test@example.com 123456 newPassword123');

  } catch (error) {
    console.error('❌ Test failed!');
    if (error.response) {
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

async function testVerifyCode(email, code) {
  try {
    console.log(`🔐 Verifying code ${code} for ${email}...`);
    const response = await axios.post(`${BASE_URL}/auth/verify-reset-code`, {
      emailOrPhone: email,
      code: code
    });
    console.log('✅ Code verified:', response.data);
  } catch (error) {
    console.error('❌ Verification failed!');
    if (error.response) {
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

async function testResetPassword(email, code, newPassword) {
  try {
    console.log(`🔑 Resetting password for ${email}...`);
    const response = await axios.post(`${BASE_URL}/auth/reset-password`, {
      emailOrPhone: email,
      code: code,
      newPassword: newPassword
    });
    console.log('✅ Password reset:', response.data);
  } catch (error) {
    console.error('❌ Password reset failed!');
    if (error.response) {
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Command line interface
const command = process.argv[2];
const email = process.argv[3];
const code = process.argv[4];
const password = process.argv[5];

if (command === 'verify' && email && code) {
  testVerifyCode(email, code);
} else if (command === 'reset' && email && code && password) {
  testResetPassword(email, code, password);
} else {
  testForgotPasswordFlow();
}
