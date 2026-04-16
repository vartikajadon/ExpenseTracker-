const { Pool } = require('pg');
const dns = require('dns');
require('dotenv').config();

// Fix: Prefer IPv4 for DNS resolution to avoid Supabase ENOTFOUND issues in Node.js
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

// Fix: Unblock self-signed certificate issues for local development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Pre-check for placeholder DATABASE_URL
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('user:password@host')) {
    console.error('CRITICAL: DATABASE_URL is missing or contains placeholders in .env file!');
}

// Create a new connection pool using the DATABASE_URL from .env
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

/**
 * Executes a query using the connection pool.
 * @param {string} text - The SQL query text.
 * @param {Array} params - Optional parameters for the query.
 * @returns {Promise<any>} - The query result rows.
 */
const query = async (text, params) => {
    try {
        const start = Date.now();
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('Database query error:', error.message);
        // Special case: Database not connected
        if (error.message.includes('password authentication') || error.message.includes('getaddrinfo')) {
            throw new Error("DATABASE_CONNECTION_ERROR");
        }
        throw error;
    }
};

module.exports = {
    query,
    pool
};
