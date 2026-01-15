const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'tasks.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + dbPath + ': ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.serialize(() => {
            // 1. Create Categories Table
            db.run(`CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                color TEXT NOT NULL
            )`);

            // 2. Insert Default Categories
            const defaultCategories = [
                { name: 'General', color: '#95a5a6' },
                { name: 'Work', color: '#3498db' },
                { name: 'Personal', color: '#9b59b6' },
                { name: 'Shopping', color: '#2ecc71' },
                { name: 'Health', color: '#e74c3c' }
            ];

            const insertCategory = db.prepare("INSERT OR IGNORE INTO categories (name, color) VALUES (?, ?)");
            defaultCategories.forEach(cat => {
                insertCategory.run(cat.name, cat.color);
            });
            insertCategory.finalize();

            // 3. Create Tasks Table (or ensure it exists)
            db.run(`CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT NOT NULL,
                completed INTEGER DEFAULT 0,
                category TEXT DEFAULT 'General',
                category_id INTEGER,
                FOREIGN KEY(category_id) REFERENCES categories(id)
            )`);

            // 4. Migration: Add category_id if it doesn't exist
            db.all("PRAGMA table_info(tasks)", (err, columns) => {
                if (err) {
                    console.error("Error getting table info:", err);
                    return;
                }
                const hasCategoryId = columns.some(col => col.name === 'category_id');
                if (!hasCategoryId) {
                    console.log("Migrating: Adding category_id to tasks...");
                    db.run("ALTER TABLE tasks ADD COLUMN category_id INTEGER", (err) => {
                        if (err) {
                            console.error("Error adding column:", err);
                            return;
                        }
                        // Backfill category_id based on text category
                        db.run(`UPDATE tasks 
                                SET category_id = (SELECT id FROM categories WHERE name = tasks.category)
                                WHERE category_id IS NULL`);
                        console.log("Migration: category_id added and data backfilled.");
                    });
                }
            });
        });
    }
});

module.exports = db;
