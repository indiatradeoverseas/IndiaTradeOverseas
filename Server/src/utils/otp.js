function generateOtp() {
    const otp = Math.floor(100000 + Math.random() * 900000);
    return otp.toString();
    // retrun '123456';
}
function getOtpHtml(otp, email = '') {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verificationUrl = email 
      ? `${frontendUrl}/verify-email?email=${encodeURIComponent(email)}&otp=${otp}`
      : `${frontendUrl}/verify-email`;

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Email Verification - IndiaTradeOverseas</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 30px auto;
            background: #ffffff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #eeeeee;
            padding-bottom: 20px;
        }
        .header h2 {
            color: #333333;
            margin: 0;
        }
        .content {
            padding: 20px 0;
            line-height: 1.6;
            color: #555555;
        }
        .btn-container {
            text-align: center;
            margin: 30px 0;
        }
        .btn {
            background-color: #007bff;
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 25px;
            border-radius: 5px;
            font-weight: bold;
            display: inline-block;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eeeeee;
            text-align: center;
            font-size: 12px;
            color: #999999;
        }
        .otp {
            font-size: 28px;
            font-weight: bold;
            color: #333333;
            letter-spacing: 5px;
            text-align: center;
            margin: 20px 0;
        }
    </style>
</head>
<body>

    <div class="container">
        <div class="header">
            <h2>IndiaTradeOverseas</h2>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>Thank you for registering with <strong>IndiaTradeOverseas</strong>. To complete your sign-up and secure your account, please verify your email address by clicking the button below:</p>
            
            <div class="btn-container">
                <a href="${verificationUrl}" class="btn">Verify Email Address</a>
            </div>
            
            <p>Alternatively, you can use the following 6-digit OTP code to verify your account:</p>
            <p class="otp">${otp}</p>
            
            <p>If the button above doesn't work, copy and paste the following link into your web browser:</p>
            <p style="word-break: break-all; color: #007bff;">${verificationUrl}</p>
            
            <p>If you did not create an account, you can safely ignore this email.</p>
        </div>
        <div class="footer">
            <p>&copy; 2026 IndiaTradeOverseas. All rights reserved.</p>
        </div>
    </div>

</body>
</html>`;
}

module.exports = {
    generateOtp,
    getOtpHtml
};
