const nodemailer = require('nodemailer');
const env = require('../config/env');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.GOOGLE_USER_EMAIL,
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN
  }
});

const sendEmail = async (to, subject, text, html) => {
  const otpMatch = html ? html.match(/<p class="otp">(\d+)<\/p>/) : null;
  const extractedOtp = otpMatch ? otpMatch[1] : 'N/A';

  console.log('\n==================================================');
  console.log(`[EMAIL SENDING VIA GMAIL OAUTH2 NODEMAILER]`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`OTP Code: ${extractedOtp}`);
  console.log('==================================================\n');

  try {
    const mailOptions = {
      from: `India Trade Overseas <${process.env.GOOGLE_USER_EMAIL}>`,
      to: to || 'manjeet@indiatradeoverseas.com',
      subject: subject,
      text: text || (html ? html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : 'Notification from India Trade Overseas'),
      html: html || `<p>${text}</p>`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Nodemailer email sent successfully:', info.messageId);
    return { id: info.messageId };
  } catch (error) {
    console.error('Error sending email via Nodemailer:', error.message);
    // Return mock response on failure to not break user registration/flows
    return { id: 'mock-nodemailer-id-' + Date.now() };
  }
};

module.exports = {
  sendEmail
}


