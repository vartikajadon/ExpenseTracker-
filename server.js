const express = require('express');
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Allow frontend to communicate with backend
app.use(express.json()); // Parse JSON request bodies
app.use(express.static(__dirname)); // Serve frontend files (HTML, JS, CSS) from current directory

/**
 * API Endpoint: /api/insights
 * Receives expense summaries from frontend and fetches AI insights from Groq.
 */
app.post('/api/insights', async (req, res) => {
    try {
        const { summary, total, budget, categories } = req.body;

        // Structured prompt to guide AI into exact categorized output
        const prompt = `Analyze this spending data and provide EXACTLY 3 short, one-line bullet points.
        
        Format Requirements:
        - Line 1 MUST start with "High Alert:" followed by the category with the highest spending.
        - Line 2 MUST start with "Tip:" followed by one practical, short saving tip.
        - Line 3 MUST start with "Warning:" followed by a status update (only if budget is set). If under budget, say "You are safely within your budget." If over/near, warn about the limit.

        Summary Data:
        - Total Spent: ${total}
        - Monthly Budget: ${budget}
        - Spending Breakdown: ${summary}
        - Top Categories: ${categories.join(', ')}

        Keep each point to one simple sentence. No extra text. No bolding.`;

        // POST request to Groq API using the secure key from .env
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

        // Return only the text content from AI
        const insights = response.data.choices[0].message.content;
        res.status(200).json({ success: true, insights });

    } catch (error) {
        console.error('Error fetching Groq insights:', error.response ? error.response.data : error.message);
        res.status(500).json({ 
            success: false, 
            message: "Unable to fetch insights right now. Please try again later." 
        });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Secure AI Backend is running on http://localhost:${PORT}`);
    console.log('Ensure your GROQ_API_KEY is correctly set in the .env file.');
});
