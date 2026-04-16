const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * Configure Nodemailer Transporter
 */
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Send OTP Email
 * @param {string} to - Recipient email
 * @param {string} otpCode - The 6-digit OTP
 */
const sendOTP = async (to, otpCode) => {
    const mailOptions = {
        from: `"AI Expense Tracker" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: 'Your Identity Verification Code',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #333; text-align: center;">Verify Your Identity</h2>
                <p style="font-size: 16px; color: #555;">Hello,</p>
                <p style="font-size: 16px; color: #555;">To complete your login or registration on the <strong>AI Expense Tracker</strong>, please use the following one-time password (OTP):</p>
                <div style="background: #f4f4f4; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2c3e50;">${otpCode}</span>
                </div>
                <p style="font-size: 14px; color: #888;">This code is valid for <strong>5 minutes</strong>. If you did not request this code, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #aaa; text-align: center;">Powered by AI Assistant &bull; Expense Tracker</p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('[MAIL] OTP Sent to:', to, '| Response:', info.response);
        return { success: true, message: "Email sent" };
    } catch (error) {
        console.error('[MAIL] Error sending email:', error.message);
        return { success: false, message: error.message };
    }
};

module.exports = {
    sendOTP
};
