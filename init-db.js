const fs = require('fs');
const path = require('path');
const db = require('./database');

/**
 * Script to initialize the PostgreSQL database tables.
 * Reads logic from schema.sql and executes it.
 */
const initDatabase = async () => {
    try {
        console.log("Reading schema.sql...");
        const schemaPath = path.join(__dirname, 'schema.sql');
        const sql = fs.readFileSync(schemaPath, 'utf8');

        console.log("Executing SQL schema...");
        await db.query(sql);

        console.log("✅ Database initialized successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Failed to initialize database:", error.message);
        process.exit(1);
    }
};

initDatabase();
