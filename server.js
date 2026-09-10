const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database Setup
const db = new sqlite3.Database('./inventory.db', (err) => {
    if (err) console.error('Error opening database', err.message);
    else console.log('Connected to SQLite database.');
});

// Create Users and Entries Tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'user'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        system_name TEXT,
        site_name TEXT,
        processor TEXT,
        generation TEXT,
        make TEXT,
        serial_number TEXT,
        location TEXT,
        user_name TEXT,
        screen_make TEXT,
        screen_serial_number TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, () => {
        // Automatically add columns if upgrading from an older database version
        db.run(`ALTER TABLE entries ADD COLUMN screen_make TEXT`, () => {});
        db.run(`ALTER TABLE entries ADD COLUMN screen_serial_number TEXT`, () => {});
    });

    // Insert default admin account if it doesn't exist
    db.get(`SELECT * FROM users WHERE username = ?`, ['admin'], (err, row) => {
        if (!row) {
            db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, ['admin', 'admin123', 'admin']);
        }
    });
});

// API: Login User
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const query = `SELECT * FROM users WHERE username = ? AND password = ?`;
    
    db.get(query, [username, password], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(401).json({ error: 'Invalid username or password.' });
        
        res.json({ message: 'Login successful', username: row.username, role: row.role });
    });
});

// API: Admin creates a new user
app.post('/api/admin/users', (req, res) => {
    const { username, password } = req.body;
    const query = `INSERT INTO users (username, password, role) VALUES (?, ?, 'user')`;
    
    db.run(query, [username, password], function(err) {
        if (err) {
            return res.status(400).json({ error: 'Username already exists or invalid data.' });
        }
        res.json({ message: 'User created successfully!' });
    });
});

// API: Admin gets all users
app.get('/api/admin/users', (req, res) => {
    db.all(`SELECT id, username, role FROM users`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API: Admin updates a user
app.put('/api/admin/users/:id', (req, res) => {
    const { id } = req.params;
    const { username, password } = req.body;
    
    let query, params;
    if (password && password.trim() !== '') {
        query = `UPDATE users SET username = ?, password = ? WHERE id = ?`;
        params = [username, password, id];
    } else {
        query = `UPDATE users SET username = ? WHERE id = ?`;
        params = [username, id];
    }

    db.run(query, params, function(err) {
        if (err) return res.status(400).json({ error: 'Username already exists or invalid data.' });
        res.json({ message: 'User updated successfully!' });
    });
});

// API: Admin deletes a user
app.delete('/api/admin/users/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM users WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'User deleted successfully!' });
    });
});

// API: Add a new entry
app.post('/api/entries', (req, res) => {
    const { system_name, site_name, processor, generation, make, serial_number, location, user_name, screen_make, screen_serial_number } = req.body;
    
    const query = `INSERT INTO entries (system_name, site_name, processor, generation, make, serial_number, location, user_name, screen_make, screen_serial_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(query, [system_name, site_name, processor, generation, make, serial_number, location, user_name, screen_make, screen_serial_number], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Entry added successfully!', id: this.lastID });
    });
});

// API: Get all entries (for Admin)
app.get('/api/entries', (req, res) => {
    db.all(`SELECT * FROM entries ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API: Delete an asset entry
app.delete('/api/entries/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM entries WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Entry deleted successfully!' });
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});