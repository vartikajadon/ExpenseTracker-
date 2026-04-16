const jwt = require('jsonwebtoken');

/**
 * Middleware: Verify JWT Token
 * Protects routes by checking if a valid token is present in the headers.
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Expecting 'Bearer <token>'

    if (!token) {
        return res.status(401).json({ success: false, message: "Access denied. No token provided." });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: "Invalid or expired token." });
        }
        
        // Attach user info to the request object
        req.user = user;
        next();
    });
};

module.exports = authenticateToken;
