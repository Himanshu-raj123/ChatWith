const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE !== 'false', // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER, // e.g., kurkuri2005@gmail.com
    pass: process.env.SMTP_PASS  // SMTP app password
  }
});

/**
 * Sends a welcome email to a newly signed up user
 * @param {string} toEmail - The recipient's email address
 * @param {string} toName - The recipient's full name
 * @param {string} password - The recipient's raw password
 * @returns {Promise<boolean>}
 */
async function sendWelcomeEmail(toEmail, toName, password) {
  // Check if SMTP is configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("SMTP credentials (SMTP_USER, SMTP_PASS) not configured. Skipping welcome email.");
    return false;
  }

  const mailOptions = {
    from: `"ChatWith Team" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: "Welcome to ChatWith! 🚀",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f8fafc;
            color: #334155;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
            border: 1px solid #e2e8f0;
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
            padding: 40px 20px;
            text-align: center;
            color: #ffffff;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 800;
            letter-spacing: -0.5px;
          }
          .content {
            padding: 40px 30px;
            line-height: 1.6;
          }
          .content h2 {
            color: #0f172a;
            font-size: 20px;
            margin-top: 0;
            font-weight: 700;
          }
          .content p {
            font-size: 16px;
            color: #475569;
            margin-bottom: 24px;
          }
          .creds-box {
            background-color: #f1f5f9;
            padding: 20px;
            border-radius: 12px;
            margin: 25px 0;
            border: 1px solid #e2e8f0;
          }
          .creds-title {
            margin-bottom: 10px;
            color: #475569;
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .creds-detail {
            font-size: 15px;
            color: #0f172a;
            margin-bottom: 6px;
            font-family: monospace;
          }
          .creds-detail:last-child {
            margin-bottom: 0;
          }
          .btn {
            display: inline-block;
            background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
            text-align: center;
          }
          .footer {
            background-color: #f8fafc;
            padding: 20px 30px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 14px;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ChatWith</h1>
          </div>
          <div class="content">
            <h2>Hi ${toName},</h2>
            <p>Welcome to ChatWith! Your account has been created successfully. We're thrilled to have you join our community.</p>
            
            <div class="creds-box">
              <div class="creds-title">Your Account Credentials</div>
              <div class="creds-detail"><strong>Email Address:</strong> ${toEmail}</div>
              <div class="creds-detail"><strong>Password:</strong> ${password}</div>
            </div>

            <p>You can now connect instantly with your friends in real-time, or chat with <strong>Swayam</strong>, our smart AI assistant powered by Groq.</p>
            <div style="text-align: center; margin: 35px 0;">
              <a href="${process.env.APP_URL || 'http://localhost:4000'}" class="btn">Launch ChatWith</a>
            </div>
            <p>If you have any questions or need support, simply reply to this email.</p>
            <p>Cheers,<br>The ChatWith Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 ChatWith. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email successfully sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error(`Failed to send welcome email to ${toEmail}:`, error);
    return false;
  }
}

module.exports = { sendWelcomeEmail };
