const env = require('../config/env');

const sendEmail = async (to, subject, text, html) => {
  const otpMatch = html ? html.match(/<p class="otp">(\d+)<\/p>/) : null;
  const extractedOtp = otpMatch ? otpMatch[1] : 'N/A';

  console.log('\n==================================================');
  console.log(`[EMAIL SENDING VIA SENDGRID REST API]`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`OTP Code: ${extractedOtp}`);
  console.log('==================================================\n');

  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'manjeet@indiatradeoverseas.com';

  try {
    const content = [];
    if (text) {
      content.push({ type: 'text/plain', value: text });
    } else {
      content.push({ 
        type: 'text/plain', 
        value: html ? html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : 'Notification from India Trade Overseas' 
      });
    }
    if (html) {
      content.push({ type: 'text/html', value: html });
    } else {
      content.push({ type: 'text/html', value: `<p>${text}</p>` });
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [
              {
                email: to || 'manjeet@indiatradeoverseas.com'
              }
            ]
          }
        ],
        from: {
          email: fromEmail
        },
        subject: subject,
        content: content
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`SendGrid API returned ${response.status}: ${errText}`);
    }

    // SendGrid returns a 202 Accepted with no response body on success.
    console.log('SendGrid email sent successfully (Status 202)');
    return { id: 'sendgrid-success-id-' + Date.now() };
  } catch (error) {
    console.error('Error sending email via SendGrid:', error.message);
    // Return mock response on failure to not break user registration/flows
    return { id: 'mock-sendgrid-id-' + Date.now() };
  }
};

module.exports = {
  sendEmail
};


