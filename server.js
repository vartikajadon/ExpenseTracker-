const express = require('express');
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv');
const authenticateToken = require('./middleware/auth');

// Load environment variables
dotenv.config();

const authRoutes = require('./routes/auth');
const expenseRoutes = require('./routes/expenses');
const configRoutes = require('./routes/config');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use(express.static('.'));

// Health Check & Diagnostics (Helpful for Vercel troubleshooting)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'UP',
        databaseLinked: !!process.env.DATABASE_URL,
        googleLinked: !!process.env.GOOGLE_CLIENT_ID,
        environment: process.env.NODE_ENV || 'development'
    });
});

// Debug Logging
app.use('/api', (req, res, next) => {
    console.log(`[API REQUEST] ${req.method} ${req.originalUrl}`);
    next();
});

// Authentication APIs
app.use('/api/auth', authRoutes);

// Config APIs (Safe fallback)
app.use('/api/config', (req, res) => {
    res.json({
        googleClientId: process.env.GOOGLE_CLIENT_ID || null
    });
});

// Protected Expense APIs
app.use('/api/expenses', expenseRoutes);

/**
 * API Endpoint: /api/insights (Protected)
 */
app.post('/api/insights', authenticateToken, async (req, res) => {
    try {
        const { summary, total, budget, categories } = req.body;
        const prompt = `Analyze this spending data and provide 3-4 short, actionable financial insights in simple bullet points. 
        Summary Data:
        - Total Spent: ${total}
        - Monthly Budget: ${budget}
        - Spending Breakdown: ${summary}
        - Top Categories: ${categories ? categories.join(', ') : 'None'}

        Guidelines: Max 3-4 insights, one-line bullet points, simple English.`;

        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        res.status(200).json({ success: true, insights: response.data.choices[0].message.content });
    } catch (error) {
        console.error('AI Insight Error:', error.message);
        res.status(200).json({ success: false, insights: "Unable to calculate insights right now." });
    }
});

// Vercel Logic: Only start the server if not running in a serverless environment
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

// Export for Vercel
module.exports = app;
