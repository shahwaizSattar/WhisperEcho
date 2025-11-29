require('dotenv').config();

const { sendOtpEmail } = require('./utils/emailService');

async function test() {
  console.log('🧪 Testing email service...');
  console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'PRESENT' : 'MISSING');
  
  try {
    console.log('\n📧 Sending test OTP email...');
    const result = await sendOtpEmail('test@example.com', '123456');
    console.log('✅ Email sent successfully!');
    console.log('Response:', result);
  } catch (error) {
    console.error('❌ Email sending failed!');
    console.error('Error message:', error.message);
    console.error('Full error:', error);
  }
}

test();
