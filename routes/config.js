const express = require('express');
const router = express.Router();

/**
 * Route: GET /api/config
 * Returns public configuration for the frontend.
 */
router.get('/', (req, res) => {
    res.json({
        googleClientId: process.env.GOOGLE_CLIENT_ID || null
    });
});

module.exports = router;
