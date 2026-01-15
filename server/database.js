const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'tasks.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + dbPath + ': ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            completed INTEGER DEFAULT 0,
            category TEXT DEFAULT 'General'
        )`, (err) => {
            if (err) {
                console.error('Error creating table: ' + err.message);
            } else {
                // Verification/Migration: Try to add the column if it doesn't exist (for existing DBs)
                // This will fail harmlessly if the column already exists
                db.run(`ALTER TABLE tasks ADD COLUMN category TEXT DEFAULT 'General'`, (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        // Only log real errors, ignore "duplicate column"
                        console.log('Schema check: category column likely exists or added.');
                    }
                });
            }
        });
    }
});

module.exports = db;
