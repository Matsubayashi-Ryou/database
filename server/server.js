const express = require('express');
const db = require('./database');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Get all tasks
app.get('/api/tasks', (req, res) => {
    // Join with categories to get color and name using category_id
    // Fallback to text 'category' column if category_id is null (migration handling)
    const sql = `
        SELECT t.id, t.text, t.completed, 
               COALESCE(c.name, t.category) as category, 
               COALESCE(c.color, '#95a5a6') as color,
               t.category_id 
        FROM tasks t
        LEFT JOIN categories c ON t.category_id = c.id
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

// Create a new task
app.post('/api/tasks', (req, res) => {
    const { text, category, category_id } = req.body;

    // Logic: If category_id provided, use it. If only name provided, we try to find it or default.
    // Ideally frontend sends category_id.

    const sql = 'INSERT INTO tasks (text, category, category_id) VALUES (?, ?, ?)';
    // We still save 'category' text for fallback/redundancy or we can just fetch it.
    // Let's assume frontend sends both for now to be safe, or we just save what we have.
    const params = [text, category, category_id];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": { id: this.lastID, text, completed: 0, category, category_id }
        });
    });
});

// Update a task (toggle completion)
app.put('/api/tasks/:id', (req, res) => {
    const { completed } = req.body;
    const sql = 'UPDATE tasks SET completed = ? WHERE id = ?';
    db.run(sql, [completed, req.params.id], function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "changes": this.changes
        });
    });
});

// Delete a task
app.delete('/api/tasks/:id', (req, res) => {
    const sql = 'DELETE FROM tasks WHERE id = ?';
    db.run(sql, req.params.id, function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "deleted", changes: this.changes });
    });
});

// --- Categories API ---

// Get all categories
app.get('/api/categories', (req, res) => {
    const sql = "SELECT * FROM categories";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

// Create a new category
app.post('/api/categories', (req, res) => {
    const { name, color } = req.body;
    const sql = 'INSERT INTO categories (name, color) VALUES (?, ?)';
    db.run(sql, [name, color], function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": { id: this.lastID, name, color }
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
