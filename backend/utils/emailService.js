const nodemailer = require('nodemailer');

const getTransporter = () => {
  const login = process.env.BREVO_LOGIN;
  const password = process.env.BREVO_PASSWORD;
  
  if (!login || !password) {
    console.error('❌ Email Service Error: BREVO_LOGIN or BREVO_PASSWORD not configured');
  }
  
  return nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: login,
      pass: password
    }
  });
};

let transporter = null;
const getMailer = () => {
  if (!transporter) {
    transporter = getTransporter();
  }
  return transporter;
};

const sendEmail = async (to, subject, htmlContent) => {
  try {
    const mailer = getMailer();
    const response = await mailer.sendMail({
      from: process.env.BREVO_FROM_EMAIL || 'mindsetmagic30@gmail.com',
      to,
      subject,
      html: htmlContent
    });
    console.log('✅ Email sent successfully:', response.messageId);
    return response;
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    throw error;
  }
};

const sendOtpEmail = async (email, otp) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Your OTP Code</h2>
      <p>Your verification code is:</p>
      <div style="background: #f0f0f0; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
        ${otp}
      </div>
      <p>This code expires in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    </div>
  `;
  return sendEmail(email, 'Your OTP Code', htmlContent);
};

const sendPasswordResetEmail = async (email, resetLink) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Reset Request</h2>
      <p>We received a request to reset your password. Click the button below to reset it:</p>
      <div style="margin: 20px 0;">
        <a href="${resetLink}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p>Or copy this link: <a href="${resetLink}">${resetLink}</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    </div>
  `;
  return sendEmail(email, 'Password Reset Request', htmlContent);
};

const verifyConnection = async () => {
  try {
    const mailer = getMailer();
    await mailer.verify();
    console.log('✅ Email service connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Email service connection failed:', error.message);
    return false;
  }
};

module.exports = {
  sendEmail,
  sendOtpEmail,
  sendPasswordResetEmail,
  verifyConnection
};
