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
app.use(express.static('.')); // Serve static files (index.html, etc.) from this directory

/**
 * API Endpoint: /api/insights
 * Receives expense summaries from frontend and fetches AI insights from Groq.
 */
app.post('/api/insights', async (req, res) => {
    try {
        const { summary, total, budget, categories } = req.body;

        // Structured prompt to guide AI
        const prompt = `Analyze this spending data and provide 3-4 short, actionable financial insights in simple bullet points. 
        Summary Data:
        - Total Spent: ${total}
        - Monthly Budget: ${budget}
        - Spending Breakdown: ${summary}
        - Top Categories: ${categories.join(', ')}

        Guidelines:
        - Max 3-4 insights.
        - One-line bullet points.
        - Simple English for a beginner user.
        - Be encouraging but clear about overspending.`;

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
