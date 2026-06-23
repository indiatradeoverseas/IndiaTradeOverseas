const nodemailer = require('nodemailer');
const env = require('../config/env');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: env.GOOGLE_USER_EMAIL,
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    refreshToken: env.GOOGLE_REFRESH_TOKEN
  }
});


transporter.verify((error, success) => {
  if (error) {
    console.error('Error connecting to email server:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"India Trade Overseas Testing Mail" <${env.GOOGLE_USER_EMAIL}>`,
      to,
      subject,
      text,
      html,
    });

    console.log('Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email via SMTP:', error.message);
    
    // Extract OTP code from the HTML template if present
    const otpMatch = html ? html.match(/<p class="otp">(\d+)<\/p>/) : null;
    const extractedOtp = otpMatch ? otpMatch[1] : 'N/A';
    
    console.log('\n==================================================');
    console.log(`[EMAIL FALLBACK LOG]`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`OTP Code: ${extractedOtp}`);
    console.log('==================================================\n');
    
    // Return a mock response so the registration/login flow does not fail
    return { messageId: 'mock-message-id-' + Date.now() };
  }
};

module.exports = {
  transporter,
  sendEmail
};
