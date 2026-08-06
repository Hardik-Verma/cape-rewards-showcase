const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'capeverse-super-secret-key';

// Secure config for frontend
router.get('/config', (req, res) => {
    res.json({
        cpaUrl: process.env.BITCOTASKS_URL || ''
    });
});

// Auth Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token == null) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Forbidden' });
        req.user = user;
        next();
    });
}

// --- AUTHENTICATION ENDPOINTS ---

router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hashedPassword], function(err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT') {
                    return res.status(400).json({ error: 'Username already exists' });
                }
                return res.status(500).json({ error: 'Database error' });
            }
            res.status(201).json({ success: true, message: 'User registered' });
        });
    } catch (e) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(400).json({ error: 'Invalid username or password' });

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ error: 'Invalid username or password' });

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token });
    });
});

router.get('/me', authenticateToken, (req, res) => {
    db.get('SELECT id, username, balance FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true, user });
    });
});

// --- CASHOUT & HISTORY ENDPOINTS ---

router.post('/cashout', authenticateToken, (req, res) => {
    const { rewardId, cost, rewardName } = req.body;
    if (cost === undefined || !rewardName) return res.status(400).json({ error: 'Invalid reward details' });

    db.serialize(() => {
        db.get('SELECT balance FROM users WHERE id = ?', [req.user.id], (err, user) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (!user) return res.status(404).json({ error: 'User not found' });

            if (user.balance < cost) {
                return res.status(400).json({ error: 'Not enough points' });
            }

            // Deduct balance to 0 (per user's previous request to reset balance to 0 on cashout)
            db.run('UPDATE users SET balance = 0 WHERE id = ?', [req.user.id], function(err) {
                if (err) return res.status(500).json({ error: 'Failed to deduct balance' });

                const token = uuidv4(); // Generate redemption token
                const timestamp = Date.now();

                db.run('INSERT INTO orders (user_id, name, token, points, timestamp) VALUES (?, ?, ?, ?, ?)', 
                    [req.user.id, rewardName, token, cost, timestamp], function(err) {
                    if (err) return res.status(500).json({ error: 'Failed to record order' });
                    
                    res.json({ success: true, token });
                });
            });
        });
    });
});

router.get('/history', authenticateToken, (req, res) => {
    db.all('SELECT name, token, points, timestamp FROM orders WHERE user_id = ? ORDER BY timestamp DESC', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        
        // Format for the frontend
        const history = rows.map(r => ({
            ...r,
            date: new Date(r.timestamp).toLocaleDateString()
        }));
        
        res.json({ success: true, history });
    });
});

// --- CPA ENDPOINTS ---

// Postback URL for the CPA network to hit when a user completes a survey
// Format: /api/postback?user_id={subid}&secret=YOUR_SECRET&reward={amount}
router.get('/postback', (req, res) => {
    const { user_id, secret, reward } = req.query;

    const expectedSecret = process.env.BITCOTASKS_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
    
    const rewardAmount = parseInt(reward) || 150;
    const token = uuidv4();

    db.serialize(() => {
        db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [rewardAmount, user_id]);
        db.run('INSERT INTO tokens (token, user_id) VALUES (?, ?)', [token, user_id], function(err) {
            if (err) {
                console.error('Error inserting token:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            console.log(`Generated real postback token ${token} for user ${user_id} and added ${rewardAmount} points`);
            res.status(200).json({ success: true, token });
        });
    });
});

// FOR CLIENT TESTING ONLY - Simulate a postback
router.get('/test-postback', (req, res) => {
    const { user_id, reward } = req.query;
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

    const rewardAmount = parseInt(reward) || 150;
    const token = uuidv4();
    
    db.serialize(() => {
        db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [rewardAmount, user_id]);
        db.run('INSERT INTO tokens (token, user_id) VALUES (?, ?)', [token, user_id], function(err) {
            if (err) {
                console.error('Error inserting test token:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            console.log(`Generated TEST bypass token ${token} for user ${user_id} and added ${rewardAmount} points`);
            res.status(200).json({ success: true, token });
        });
    });
});

// Legacy polling endpoint for the frontend to check if their token is ready
// Still kept to alert frontend, but it doesn't need to track balance anymore
router.get('/check-status', (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

    db.get('SELECT token FROM tokens WHERE user_id = ? AND redeemed = 0 ORDER BY created_at DESC LIMIT 1', [user_id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Internal server error' });
        
        if (row) {
            res.status(200).json({ status: 'completed', token: row.token });
        } else {
            res.status(200).json({ status: 'pending' });
        }
    });
});

module.exports = router;
