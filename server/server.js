const express = require('express');
const db = require('./database');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Get all tasks
app.get('/api/tasks', (req, res) => {
    const sql = "SELECT * FROM tasks ORDER BY id DESC";
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
    const { text, category } = req.body; // Default category handled by DB if undefined, or frontend
    const sql = 'INSERT INTO tasks (text, category) VALUES (?, ?)';
    const categoryToInsert = category || 'General';
    db.run(sql, [text, categoryToInsert], function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": { id: this.lastID, text, completed: 0, category: categoryToInsert }
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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
