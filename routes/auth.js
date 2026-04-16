const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const db = require('../database');
const { sendOTP } = require('../emailService');
const { sendSmsOTP } = require('../smsService');
const { OAuth2Client } = require('google-auth-library');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/** 
 * Helper: Generate 6-digit OTP
 */
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Standardized OTP delivery and persistence logic is now fully database-backed.

/**
 * Route: POST /api/auth/send-otp
 * Validates identifier (email/phone) and sends/logs an OTP.
 */
router.post('/send-otp', async (req, res) => {
    const { email, phone } = req.body;
    let identifier = email || phone;

    if (!identifier) {
        return res.status(400).json({ success: false, message: "Email or phone is required." });
    }

    if (email && !validator.isEmail(email)) {
        return res.status(400).json({ success: false, message: "Invalid email format." });
    }

    try {
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60000); // 5 mins

        console.log(`[AUTH] OTP for ${identifier}: ${otp} (Sending email...)`);
        
        // Actually send the email
        const mailResult = await sendOTP(identifier, otp);
        if (!mailResult.success) {
            console.warn('[AUTH] Email failed to send, falling back to console:', mailResult.message);
        }

        // Find existing user to verify duplicates or link for forgot password
        let userResult = await db.query('SELECT id FROM users WHERE email = $1 OR phone = $2', [email, phone]);
        
        // Block OTP generation if the user is signing up and email/phone is already used.
        // We know it's a signup/duplicate check context if it's sent from the signup form and NOT the forgot-password form.
        // (Wait, we can simply reject it if it already exists here, but we also use send-otp for regular registration,
        // so we reject it if the account is fundamentally already registered)
        if (userResult.rowCount > 0 && req.url.includes('send-otp')) {
            return res.status(400).json({ success: false, message: "This email is already registered" });
        }
        
        const userId = userResult.rowCount > 0 ? userResult.rows[0].id : null;

        // Persist to DB using identifier
        await db.query('DELETE FROM otp_verifications WHERE identifier = $1', [identifier]);
        await db.query(
            'INSERT INTO otp_verifications (identifier, user_id, otp_code, expires_at) VALUES ($1, $2, $3, $4)', 
            [identifier, userId, otp, expiresAt]
        );

        res.status(200).json({ success: true, message: "OTP sent (check server console)." });
    } catch (error) {
        console.error('Send-OTP error:', error);
        res.status(500).json({ success: false, message: "Server error during OTP generation." });
    }
});

/**
 * Route: POST /api/auth/signup
 */
router.post('/signup', async (req, res) => {
    const { name, email, phone, password, otp } = req.body;

    // Validation
    if (!name || !password) return res.status(400).json({ success: false, message: "Missing required fields." });
    if (email && !validator.isEmail(email)) return res.status(400).json({ success: false, message: "Invalid email." });

    // Password Rules
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 chars with 1 uppercase, 1 lowercase, 1 number, and 1 special char." });
    }

    try {
        // 1. Verify OTP in DB
        const identifier = email || phone;
        const result = await db.query(
            'SELECT * FROM otp_verifications WHERE identifier = $1 AND otp_code = $2 AND expires_at > NOW()',
            [identifier, otp]
        );
        
        if (result.rowCount === 0) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
        }
        await db.query('DELETE FROM otp_verifications WHERE identifier = $1', [identifier]);

        // 2. Check if user exists
        const existing = await db.query('SELECT id FROM users WHERE email = $1 OR phone = $2', [email, phone]);
        if (existing.rowCount > 0) return res.status(400).json({ success: false, message: "User already exists." });

        // OTP Verification Logic (Simplified: checking against console-logged OTP)
        // In this implementation, we allow verification if 'otp' matches what was generated.
        // For production, this should be tracked against the identifier in DB.

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert User
        const newUser = await db.query(
            'INSERT INTO users (name, email, phone, password) VALUES ($1, $2, $3, $4) RETURNING id',
            [name, email, phone, hashedPassword]
        );

        const userId = newUser.rows[0].id;

        // Initialize user profile
        await db.query('INSERT INTO user_profiles (user_id) VALUES ($1)', [userId]);

        // Generate JWT
        const token = jwt.sign({ id: userId, email: email }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({ success: true, token, user: { id: userId, name, email } });
    } catch (error) {
        console.error('Registration/OTP Error:', error);
        if (error.message === "DATABASE_CONNECTION_ERROR") {
            return res.status(503).json({ success: false, message: "Database connection failed! Please ensure your DATABASE_URL in the .env file is correct." });
        }
        res.status(500).json({ success: false, message: "An unexpected error occurred during auth process." });
    }
});

/**
 * Route: POST /api/auth/login
 */
router.post('/login', async (req, res) => {
    const { email, phone, password } = req.body;

    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1 OR phone = $2', [email, phone]);
        if (result.rowCount === 0) return res.status(401).json({ success: false, message: "Invalid credentials." });

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials." });

        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(200).json({ success: true, token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
        console.error('Login Error:', error);
        if (error.message === "DATABASE_CONNECTION_ERROR") {
            return res.status(503).json({ success: false, message: "Database connection failed! Please check your .env configuration." });
        }
        res.status(500).json({ success: false, message: "Server error during login." });
    }
});

/**
 * Route: POST /api/auth/google-login
 */
router.post('/google-login', async (req, res) => {
    const { id_token } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: id_token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        const { email, name } = payload;

        // Check if user exists, else create
        let result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        let user;

        if (result.rowCount === 0) {
            const newUser = await db.query(
                'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
                [name, email, 'GOOGLE_AUTH_NO_PASSWORD']
            );
            user = newUser.rows[0];
            await db.query('INSERT INTO user_profiles (user_id) VALUES ($1)', [user.id]);
        } else {
            user = result.rows[0];
        }

        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(200).json({ success: true, token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(401).json({ success: false, message: "Google verification failed: " + error.message });
    }
});

/**
 * Route: POST /api/auth/forgot-password
 * Triggers reset OTP (Email or Phone)
 */
router.post('/forgot-password', async (req, res) => {
    const { email, phone } = req.body;
    const identifier = email || phone;
    
    if (!identifier) return res.status(400).json({ success: false, message: "Email or phone is required." });

    try {
        const result = await db.query('SELECT id, email, phone FROM users WHERE email = $1 OR phone = $2', [email, phone]);
        if (result.rowCount === 0) return res.status(400).json({ success: false, message: "User account with this email/phone not found." });

        const user = result.rows[0];
        const userId = user.id;
        const target = user.email || user.phone; // Targeted delivery

        const otp = generateOTP();
        const expiresAt = Date.now() + 5 * 60000; // STRICT: 5 mins

        await db.query('DELETE FROM otp_verifications WHERE identifier = $1', [target]);
        await db.query(
            'INSERT INTO otp_verifications (identifier, user_id, otp_code, expires_at) VALUES ($1, $2, $3, $4)', 
            [target, userId, otp, new Date(expiresAt)]
        );
        
        // Use sendOTP (handles email, phone can be mocked in console)
        await sendOTP(target, otp);
        res.status(200).json({ success: true, message: `Reset code sent to ${target}.` });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ success: false, message: "Error initiating password reset." });
    }
});

/**
 * Route: POST /api/auth/reset-password
 */
router.post('/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;

    // Validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 chars with 1 uppercase, 1 lowercase, 1 number, and 1 special char." });
    }

    try {
        const identifier = email; // Simplified for email, can be extended to phone
        const result = await db.query(
            'SELECT user_id FROM otp_verifications WHERE identifier = $1 AND otp_code = $2 AND expires_at > NOW()',
            [identifier, otp]
        );
        if (result.rowCount === 0) return res.status(400).json({ success: false, message: "Invalid or expired reset code." });

        const userId = result.rows[0].user_id;
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
        await db.query('DELETE FROM otp_verifications WHERE user_id = $1', [userId]);

        res.status(200).json({ success: true, message: "Password updated successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error resetting password." });
    }
});

/**
 * Route: POST /api/auth/send-phone-otp
 * Sends OTP to a phone number via Twilio SMS for passwordless login.
 */
router.post('/send-phone-otp', async (req, res) => {
    let { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number is required.' });

    // Normalize: strip non-digit chars except leading '+'
    phone = phone.trim();
    if (!phone.startsWith('+')) {
        return res.status(400).json({ success: false, message: 'Phone number must include country code (e.g. +91XXXXXXXXXX).' });
    }

    try {
        // Check if user exists with this phone
        console.log(`[AUTH] Phone OTP requested for: "${phone}"`);
        
        // Try exact match first, then try without/with country code
        let result = await db.query('SELECT id, name FROM users WHERE phone = $1', [phone]);
        
        // If not found, try matching just the last 10 digits
        if (result.rowCount === 0) {
            const last10 = phone.slice(-10);
            console.log(`[AUTH] Exact match failed. Trying partial match with last 10 digits: ${last10}`);
            result = await db.query("SELECT id, name FROM users WHERE phone LIKE $1", ['%' + last10]);
        }
        
        if (result.rowCount === 0) {
            console.log(`[AUTH] No user found for phone: "${phone}"`);
            return res.status(404).json({ success: false, message: 'No account found with this phone number. Please sign up first with this phone number.' });
        }

        const user = result.rows[0];
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60000); // 5 minutes

        // Delete existing OTP and insert new one
        await db.query('DELETE FROM otp_verifications WHERE identifier = $1', [phone]);
        await db.query(
            'INSERT INTO otp_verifications (identifier, user_id, otp_code, expires_at) VALUES ($1, $2, $3, $4)',
            [phone, user.id, otp, expiresAt]
        );

        // Send via Twilio SMS
        const smsResult = await sendSmsOTP(phone, otp);
        if (!smsResult.success) {
            console.warn('[AUTH] SMS failed:', smsResult.message);
        }

        res.status(200).json({ success: true, message: `OTP sent to ${phone.slice(0, -4).replace(/./g, '*') + phone.slice(-4)}` });
    } catch (error) {
        console.error('Send-phone-OTP error:', error);
        res.status(500).json({ success: false, message: 'Server error sending OTP.' });
    }
});

/**
 * Route: POST /api/auth/verify-phone-otp
 * Verifies phone OTP and returns JWT token for login.
 */
router.post('/verify-phone-otp', async (req, res) => {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ success: false, message: 'Phone and OTP are required.' });

    try {
        const result = await db.query(
            'SELECT ov.user_id, u.name, u.email FROM otp_verifications ov JOIN users u ON ov.user_id = u.id WHERE ov.identifier = $1 AND ov.otp_code = $2 AND ov.expires_at > NOW()',
            [phone, otp]
        );

        if (result.rowCount === 0) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
        }

        const user = result.rows[0];
        await db.query('DELETE FROM otp_verifications WHERE identifier = $1', [phone]);

        const token = jwt.sign({ id: user.user_id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(200).json({
            success: true,
            token,
            user: { id: user.user_id, name: user.name, email: user.email }
        });
    } catch (error) {
        console.error('Verify-phone-OTP error:', error);
        res.status(500).json({ success: false, message: 'Server error verifying OTP.' });
    }
});

/**
 * Route: GET /api/auth/user-profile
 * Returns the current user's profile info.
 */
router.get('/user-profile', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, message: 'Not authenticated.' });

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await db.query('SELECT id, name, email, phone FROM users WHERE id = $1', [decoded.id]);
        if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'User not found.' });

        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

/**
 * Route: POST /api/auth/update-profile
 * Updates user profile after verifying identity with current password.
 */
router.post('/update-profile', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, message: 'Not authenticated.' });

    try {
        const tokenStr = authHeader.split(' ')[1];
        const decoded = jwt.verify(tokenStr, process.env.JWT_SECRET);
        const userId = decoded.id;

        const { currentPassword, name, email, phone, newPassword } = req.body;

        // 1. Fetch current user
        const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (userResult.rowCount === 0) return res.status(404).json({ success: false, message: 'User not found.' });

        const user = userResult.rows[0];

        // 2. Verify identity with current password (skip for Google-auth users)
        if (user.password !== 'GOOGLE_AUTH_NO_PASSWORD') {
            if (!currentPassword) return res.status(400).json({ success: false, message: 'Current password is required to update profile.' });
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
        }

        // 3. Validate new email if changing
        if (email && email !== user.email) {
            if (!validator.isEmail(email)) return res.status(400).json({ success: false, message: 'Invalid email format.' });
            const existing = await db.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
            if (existing.rowCount > 0) return res.status(400).json({ success: false, message: 'Email already in use by another account.' });
        }

        // 4. Validate new phone if changing
        if (phone && phone !== user.phone) {
            const existing = await db.query('SELECT id FROM users WHERE phone = $1 AND id != $2', [phone, userId]);
            if (existing.rowCount > 0) return res.status(400).json({ success: false, message: 'Phone number already in use by another account.' });
        }

        // 5. Build update query dynamically
        const updates = [];
        const values = [];
        let idx = 1;

        if (name && name !== user.name) { updates.push(`name = $${idx++}`); values.push(name); }
        if (email && email !== user.email) { updates.push(`email = $${idx++}`); values.push(email); }
        if (phone && phone !== user.phone) { updates.push(`phone = $${idx++}`); values.push(phone); }

        if (newPassword) {
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!passwordRegex.test(newPassword)) {
                return res.status(400).json({ success: false, message: 'New password must be 8+ chars with uppercase, lowercase, number, and special char.' });
            }
            const hashed = await bcrypt.hash(newPassword, 10);
            updates.push(`password = $${idx++}`);
            values.push(hashed);
        }

        if (updates.length === 0) return res.status(400).json({ success: false, message: 'No changes to update.' });

        values.push(userId);
        await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`, values);

        // 6. Return updated user info and fresh token
        const updatedUser = await db.query('SELECT id, name, email, phone FROM users WHERE id = $1', [userId]);
        const freshUser = updatedUser.rows[0];
        const newToken = jwt.sign({ id: freshUser.id, email: freshUser.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            message: 'Profile updated successfully!',
            token: newToken,
            user: { id: freshUser.id, name: freshUser.name, email: freshUser.email }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Server error updating profile.' });
    }
});

module.exports = router;
