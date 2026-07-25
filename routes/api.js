const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');

// Secure config for frontend
router.get('/config', (req, res) => {
    res.json({
        cpaUrl: process.env.CPA_NETWORK_URL || 'https://example-survey-network.com/offer?uid='
    });
});

// Postback URL for the CPA network to hit when a user completes a survey
// Format: /api/postback?user_id=123&secret=your_postback_secret_here
router.get('/postback', (req, res) => {
    const { user_id, secret } = req.query;

    if (secret !== process.env.POSTBACK_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!user_id) {
        return res.status(400).json({ error: 'Missing user_id' });
    }

    const token = uuidv4();

    db.run('INSERT INTO tokens (token, user_id) VALUES (?, ?)', [token, user_id], function(err) {
        if (err) {
            console.error('Error inserting token:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        
        console.log(`Generated real postback token ${token} for user ${user_id}`);
        res.status(200).json({ success: true, token });
    });
});

// Polling endpoint for the frontend to check if their token is ready
router.get('/check-status', (req, res) => {
    const { user_id } = req.query;

    if (!user_id) {
        return res.status(400).json({ error: 'Missing user_id' });
    }

    // Find a token that matches this user_id and hasn't been redeemed yet
    db.get('SELECT token FROM tokens WHERE user_id = ? AND redeemed = 0 ORDER BY created_at DESC LIMIT 1', [user_id], (err, row) => {
        if (err) {
            console.error('Database error checking status:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (row) {
            res.status(200).json({ status: 'completed', token: row.token });
        } else {
            res.status(200).json({ status: 'pending' });
        }
    });
});

// --- Legacy Simulation Routes (can be removed if no longer used) ---
router.post('/start-survey', (req, res) => {
    const sessionId = uuidv4();
    db.run('INSERT INTO survey_sessions (session_id) VALUES (?)', [sessionId], function(err) {
        if (err) return res.status(500).json({ error: 'Internal server error' });
        res.status(200).json({ success: true, sessionId });
    });
});

router.post('/simulate', (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'Missing session ID.' });

    db.get('SELECT * FROM survey_sessions WHERE session_id = ?', [sessionId], (err, row) => {
        if (err || !row || row.completed) return res.status(401).json({ error: 'Invalid session.' });

        const token = uuidv4();
        db.serialize(() => {
            db.run('UPDATE survey_sessions SET completed = 1 WHERE session_id = ?', [sessionId]);
            db.run('INSERT INTO tokens (token) VALUES (?)', [token], function(err) {
                if (err) return res.status(500).json({ error: 'Internal server error' });
                res.status(200).json({ success: true, token });
            });
        });
    });
});

module.exports = router;
