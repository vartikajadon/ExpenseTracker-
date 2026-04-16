const twilio = require('twilio');
require('dotenv').config();

/**
 * Send OTP via SMS using Twilio
 * @param {string} toPhone - Phone number with country code, e.g. +919876543210
 * @param {string} otpCode - The 6-digit OTP
 */
const sendSmsOTP = async (toPhone, otpCode) => {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    // Fall back to console if Twilio is not properly configured
    if (!sid || !authToken || !fromNumber || !sid.startsWith('AC')) {
        console.log(`📱 [SMS - DEV MODE] OTP for ${toPhone}: ${otpCode}`);
        console.log(`   (Configure real Twilio credentials in .env to send actual SMS)`);
        return { success: true, message: 'OTP logged to console (Twilio not configured)' };
    }

    try {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        const message = await client.messages.create({
            body: `Your SpendMate verification code is: ${otpCode}. Valid for 5 minutes. Do not share this code.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: toPhone
        });
        console.log(`[SMS] OTP sent to ${toPhone} | SID: ${message.sid}`);
        return { success: true, message: 'SMS sent successfully' };
    } catch (error) {
        console.error('[SMS] Twilio error:', error.message);
        return { success: false, message: error.message };
    }
};

module.exports = { sendSmsOTP };
