const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("WARNING: MONGODB_URI environment variable is missing.");
} else {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log('Connected to MongoDB cloud database.'))
        .catch(err => console.error('Error connecting to MongoDB:', err));
}

// Database Models
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' }
});
const User = mongoose.model('User', UserSchema);

const EntrySchema = new mongoose.Schema({
    system_name: String,
    site_name: String,
    processor: String,
    generation: String,
    make: String,
    serial_number: String,
    location: String,
    user_name: String,
    screen_make: String,
    screen_serial_number: String,
    created_at: { type: Date, default: Date.now }
});
const Entry = mongoose.model('Entry', EntrySchema);

// Insert default admin account if it doesn't exist
mongoose.connection.once('open', async () => {
    try {
        const adminExists = await User.findOne({ username: 'admin' });
        if (!adminExists) {
            await User.create({ username: 'admin', password: 'admin123', role: 'admin' });
            console.log('Default admin user created.');
        }
    } catch (err) {
        console.error('Error seeding admin:', err);
    }
});

// API: Login User
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username, password });
        
        if (!user) return res.status(401).json({ error: 'Invalid username or password.' });
        res.json({ message: 'Login successful', username: user.username, role: user.role });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Admin creates a new user
app.post('/api/admin/users', async (req, res) => {
    try {
        const { username, password } = req.body;
        await User.create({ username, password, role: 'user' });
        res.json({ message: 'User created successfully!' });
    } catch (err) {
        res.status(400).json({ error: 'Username already exists or invalid data.' });
    }
});

// API: Admin gets all users
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.find({}, 'username role _id');
        // Rename _id to id so your frontend still works
        const formattedUsers = users.map(u => ({ id: u._id, username: u.username, role: u.role }));
        res.json(formattedUsers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Admin updates a user
app.put('/api/admin/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password } = req.body;
        
        const updateData = { username };
        if (password && password.trim() !== '') {
            updateData.password = password;
        }

        await User.findByIdAndUpdate(id, updateData);
        res.json({ message: 'User updated successfully!' });
    } catch (err) {
        res.status(400).json({ error: 'Invalid data or user not found.' });
    }
});

// API: Admin deletes a user
app.delete('/api/admin/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await User.findByIdAndDelete(id);
        res.json({ message: 'User deleted successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Add a new entry
app.post('/api/entries', async (req, res) => {
    try {
        const newEntry = await Entry.create(req.body);
        res.json({ message: 'Entry added successfully!', id: newEntry._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Get all entries (for Admin)
app.get('/api/entries', async (req, res) => {
    try {
        const entries = await Entry.find().sort({ created_at: -1 });
        const formattedEntries = entries.map(e => ({...e.toObject(), id: e._id}));
        res.json(formattedEntries);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Delete an asset entry
app.delete('/api/entries/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Entry.findByIdAndDelete(id);
        res.json({ message: 'Entry deleted successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

// Required for Vercel Serverless compatibility
module.exports = app;
