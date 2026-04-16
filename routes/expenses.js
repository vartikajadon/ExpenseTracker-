const express = require('express');
const router = express.Router();
const db = require('../database');
const authenticateToken = require('../middleware/auth');
const multer = require('multer');
const pdf = require('pdf-parse');
const Tesseract = require('tesseract.js');
const axios = require('axios');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 } // 20 MB max limit
});

/**
 * Route: POST /api/expenses/upload-invoice
 * Parses Invoice uploads and forwards to Groq AI to fetch expense parameters.
 */
router.post('/upload-invoice', authenticateToken, upload.single('invoice'), async (req, res) => {
    console.log("📥 Invoice upload started");
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded!" });
        const file = req.file;
        const mimeType = file.mimetype;
        const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];

        let aiPrompt = `Extract the following details from this invoice to add an expense entry.
Return ONLY a strictly valid JSON object with these exact keys:
"amount": (number, strictly just the total grand absolute amount spent, no strings),
"date": (string, extract the date of the receipt, format YYYY-MM-DD),
"category": (string, map strictly to one of: "Food & Drink", "Transport", "Housing", "Health", "Entertainment", "Shopping", "Education", "Other"),
"currency": (string, extract the exact currency symbol like "₹", "$", "€", "£". If none found, write null),
"note": (string, extract the vendor/store/shop Name or Place the invoice is from)

Requirements:
- ONLY add the Grand Total section. Do NOT list individual items.
- If date is not found, return today's date.
- NEVER include markdown wrapping around the JSON, just return raw JSON string.`;

        let groqModel = "";
        let requestPayload = {};
        let extractedText = "";

        if (mimeType === 'application/pdf') {
            const data = await pdf(file.buffer);
            extractedText = data.text;
            groqModel = "llama-3.3-70b-versatile";
            requestPayload = {
                model: groqModel,
                messages: [{ role: "user", content: aiPrompt + "\n\nInvoice Content:\n" + extractedText }],
                response_format: { type: "json_object" },
                temperature: 0.1
            };
        } else if (allowedImageTypes.includes(mimeType)) {
            // Tesseract OCR Processing local before LLM
            const worker = await Tesseract.createWorker('eng');
            const ret = await worker.recognize(file.buffer);
            extractedText = ret.data.text;
            await worker.terminate();
            
            groqModel = "llama-3.3-70b-versatile";
            requestPayload = {
                model: groqModel,
                messages: [{ role: "user", content: aiPrompt + "\n\nInvoice Content:\n" + extractedText }],
                response_format: { type: "json_object" },
                temperature: 0.1
            };
        } else {
            return res.status(400).json({ success: false, message: "Unsupported file type. Please upload a PDF or Image." });
        }

        console.log("📄 OCR TEXT:", extractedText);

        const aiResponse = await axios.post('https://api.groq.com/openai/v1/chat/completions', requestPayload, {
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("🤖 AI RESPONSE:", aiResponse.data);

        let content = aiResponse.data.choices[0].message.content;
        if(content.includes('\`\`\`json')) {
            content = content.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
        } else if (content.includes('\`\`\`')) {
            content = content.replace(/\`\`\`/g, '').trim();
        }

        let extractedData;
        try {
            extractedData = JSON.parse(content);
        } catch (err) {
            console.error("JSON Parse Error:", err);
            return res.status(500).json({ error: "Invalid AI response format" });
        }
        
        console.log("✅ Invoice processed:", extractedData);
        return res.status(200).json({ success: true, data: extractedData });
    } catch (error) {
        console.error("❌ FULL ERROR:", error);
        res.status(500).json({ 
            error: "Invoice processing failed",
            message: error.message,
            stack: error.stack
        });
    }
});

/**
 * Route: GET /api/expenses
 * Fetches all expenses for the currently logged-in user.
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM expenses WHERE user_id = $1 ORDER BY date DESC, created_at DESC',
            [req.user.id]
        );
        res.status(200).json({ success: true, expenses: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching expenses." });
    }
});

/**
 * Route: GET /api/expenses/profile
 * Fetches the user's budget, income, and base currency.
 */
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM user_profiles WHERE user_id = $1', [req.user.id]);
        if (result.rowCount === 0) {
            // Create profile if not exists
            const newUser = await db.query('INSERT INTO user_profiles (user_id) VALUES ($1) RETURNING *', [req.user.id]);
            return res.status(200).json({ success: true, profile: newUser.rows[0] });
        }
        res.status(200).json({ success: true, profile: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching profile." });
    }
});

/**
 * Route: PUT /api/expenses/profile
 * Updates the user's budget or income.
 */
router.put('/profile', authenticateToken, async (req, res) => {
    const { budget, income, base_currency } = req.body;

    try {
        await db.query(
            'UPDATE user_profiles SET monthly_budget = COALESCE($1, monthly_budget), monthly_income = COALESCE($2, monthly_income), base_currency = COALESCE($3, base_currency) WHERE user_id = $4',
            [budget, income, base_currency, req.user.id]
        );
        res.status(200).json({ success: true, message: "Profile updated." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating profile." });
    }
});

/**
 * Route: POST /api/expenses
 * Adds a new expense for the logged-in user.
 */
router.post('/', authenticateToken, async (req, res) => {
    const { id, amount, category, date, note, currency } = req.body;

    if (!id || !amount || !category || !date || !currency) {
        return res.status(400).json({ success: false, message: "Missing required expense details." });
    }

    try {
        await db.query(
            'INSERT INTO expenses (id, user_id, amount, category, date, note, currency) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [id, req.user.id, amount, category, date, note, currency]
        );
        res.status(201).json({ success: true, message: "Expense saved successfully." });
    } catch (error) {
        console.error('Error saving expense:', error);
        res.status(500).json({ success: false, message: "Error saving expense." });
    }
});

/**
 * Route: DELETE /api/expenses/:id
 * Removes a specific expense belonging to the logged-in user.
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query(
            'DELETE FROM expenses WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Expense not found or unauthorized." });
        }

        res.status(200).json({ success: true, message: "Expense deleted." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deleting expense." });
    }
});

/**
 * Route: PUT /api/expenses/:id
 * Updates an existing expense.
 */
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { amount, category, date, note, currency } = req.body;

    try {
        const result = await db.query(
            'UPDATE expenses SET amount = $1, category = $2, date = $3, note = $4, currency = $5 WHERE id = $6 AND user_id = $7',
            [amount, category, date, note, currency, id, req.user.id]
        );
        if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Expense not found." });
        res.status(200).json({ success: true, message: "Expense updated." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating expense." });
    }
});

module.exports = router;
