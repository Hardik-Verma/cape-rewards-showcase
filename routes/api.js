const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Item, VerificationCode, Order } = require('../database/db');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');

const JWT_SECRET = process.env.JWT_SECRET || 'capeverse-super-secret-key';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
    },
    connectionTimeout: 10000, // 10 seconds to fail fast
    greetingTimeout: 10000,
    socketTimeout: 10000
});

// Secure config for frontend
router.get('/config', (req, res) => {
    res.json({
        cpaUrl: process.env.BITCOTASKS_URL || '',
        googleClientId: process.env.GOOGLE_CLIENT_ID || ''
    });
});

// Auth Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, JWT_SECRET, async (err, userPayload) => {
        if (err) return res.status(403).json({ error: 'Forbidden' });
        try {
            const userFound = await User.findById(userPayload.id);
            if (!userFound || userFound.banned) return res.status(403).json({ error: 'You are banned.' });
            req.user = { id: userFound.id, username: userFound.username, role: userFound.role };
            next();
        } catch (e) {
            return res.status(500).json({ error: 'Database error' });
        }
    });
}

function authenticateAdmin(req, res, next) {
    authenticateToken(req, res, () => {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
        next();
    });
}

// --- AUTHENTICATION ENDPOINTS ---

router.post('/auth/google', async (req, res) => {
    const { credential } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const email = payload['email'];
        const googleId = payload['sub'];
        const name = payload['name'];

        let user = await User.findOne({ $or: [{ google_id: googleId }, { email: email }] });
        
        if (user) {
            if (user.banned) return res.status(403).json({ error: 'Account banned' });
            if (!user.google_id) {
                user.google_id = googleId;
                user.is_verified = true;
                await user.save();
            }
            const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
            return res.json({ success: true, token, role: user.role });
        } else {
            let username = name.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000);
            user = await User.create({ username, email, google_id: googleId, is_verified: true });
            const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ success: true, token, role: user.role });
        }
    } catch (e) {
        res.status(400).json({ error: 'Invalid Google token' });
    }
});

router.post('/auth/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    try {
        await VerificationCode.findOneAndUpdate(
            { email },
            { code, expires_at: expires },
            { upsert: true, new: true }
        );

        if (!process.env.SMTP_EMAIL) {
            console.log(`[MOCK EMAIL] OTP for ${email} is ${code}`);
            return res.json({ success: true, message: 'Check console for mock OTP' });
        }

        transporter.sendMail({
            from: process.env.SMTP_EMAIL,
            to: email,
            subject: 'Capeverse Verification Code',
            text: `Your verification code is: ${code}`
        }, (error) => {
            if (error) return res.status(500).json({ error: 'Failed to send email' });
            res.json({ success: true, message: 'OTP sent' });
        });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/register', async (req, res) => {
    const { username, email, password, otp } = req.body;
    if (!username || !email || !password || !otp) return res.status(400).json({ error: 'All fields required' });

    try {
        const row = await VerificationCode.findOne({ email });
        if (!row || row.code !== otp || new Date(row.expires_at) < new Date()) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) return res.status(400).json({ error: 'Username or email already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ username, email, password_hash: hashedPassword, is_verified: true });
        await VerificationCode.deleteOne({ email });
        
        res.status(201).json({ success: true, message: 'User registered' });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/login', async (req, res) => {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ error: 'Credentials required' });

    try {
        const user = await User.findOne({ $or: [{ username: identifier }, { email: identifier }] });
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });
        if (user.banned) return res.status(403).json({ error: 'Account banned' });
        if (!user.password_hash) return res.status(400).json({ error: 'Please login with Google' });

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token, role: user.role });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('id username email balance role');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true, user: { id: user.id, username: user.username, email: user.email, balance: user.balance, role: user.role } });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

// --- ITEMS (PUBLIC & ADMIN) ---

router.get('/items', async (req, res) => {
    try {
        const items = await Item.find({});
        res.json({ success: true, items });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/admin/items', authenticateAdmin, async (req, res) => {
    const { id, name, type, cost, image, stock } = req.body;
    try {
        await Item.findOneAndUpdate({ id }, { name, type, cost, image, stock }, { upsert: true });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

router.delete('/admin/items/:id', authenticateAdmin, async (req, res) => {
    try {
        await Item.deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/admin/upload', authenticateAdmin, async (req, res) => {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'No image provided' });
    
    if (!process.env.IMGBB_API_KEY) {
        return res.status(500).json({ error: 'IMGBB_API_KEY is not configured in Render environment variables.' });
    }

    try {
        const formData = new FormData();
        formData.append('image', imageBase64);
        
        const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });
        
        const data = await imgbbRes.json();
        
        if (data.success) {
            res.json({ success: true, url: data.data.url });
        } else {
            res.status(500).json({ error: 'Failed to upload to ImgBB' });
        }
    } catch (e) {
        res.status(500).json({ error: 'Error connecting to ImgBB' });
    }
});

// --- CASHOUT & HISTORY ENDPOINTS ---

router.post('/cashout', authenticateToken, async (req, res) => {
    const { rewardId } = req.body;
    
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        const item = await Item.findOne({ id: rewardId });
        if (!item) return res.status(400).json({ error: 'Invalid item' });
        
        if (item.stock === 0) return res.status(400).json({ error: 'Out of stock' });
        if (user.balance < item.cost) return res.status(400).json({ error: 'Not enough points' });

        user.balance = 0;
        await user.save();

        if (item.stock > 0) {
            item.stock -= 1;
            await item.save();
        }

        const token = uuidv4();
        const timestamp = Date.now();

        await Order.create({ user_id: user._id, name: item.name, token, points: item.cost, timestamp });
        res.json({ success: true, token });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

router.get('/history', authenticateToken, async (req, res) => {
    try {
        const rows = await Order.find({ user_id: req.user.id }).sort({ timestamp: -1 });
        const history = rows.map(r => ({ name: r.name, token: r.token, points: r.points, timestamp: r.timestamp, date: new Date(r.timestamp).toLocaleDateString() }));
        res.json({ success: true, history });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

// --- ADMIN USERS ENDPOINTS ---

router.get('/admin/users', authenticateAdmin, async (req, res) => {
    try {
        const rows = await User.find({});
        const users = rows.map(r => ({ id: r.id, username: r.username, email: r.email, balance: r.balance, role: r.role, banned: r.banned, created_at: r.created_at }));
        res.json({ success: true, users });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/admin/users/:id/points', authenticateAdmin, async (req, res) => {
    const { amount } = req.body;
    try {
        await User.findByIdAndUpdate(req.params.id, { $inc: { balance: amount } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/admin/users/:id/ban', authenticateAdmin, async (req, res) => {
    const { banned } = req.body;
    try {
        await User.findByIdAndUpdate(req.params.id, { banned: banned ? true : false });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/admin/users/:id/role', authenticateAdmin, async (req, res) => {
    const { role } = req.body;
    if (role !== 'admin' && role !== 'user') return res.status(400).json({ error: 'Invalid role' });
    try {
        await User.findByIdAndUpdate(req.params.id, { role });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

// --- CPA ENDPOINTS ---
router.get('/postback', async (req, res) => {
    const { user_id, secret, reward } = req.query;
    const expectedSecret = process.env.BITCOTASKS_SECRET;
    if (expectedSecret && secret !== expectedSecret) return res.status(401).json({ error: 'Unauthorized' });
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
    const rewardAmount = parseInt(reward) || 150;
    
    try {
        await User.findByIdAndUpdate(user_id, { $inc: { balance: rewardAmount } });
        res.status(200).json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Error' });
    }
});

router.get('/test-postback', async (req, res) => {
    const { user_id, reward } = req.query;
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
    const rewardAmount = parseInt(reward) || 150;
    
    try {
        await User.findByIdAndUpdate(user_id, { $inc: { balance: rewardAmount } });
        res.status(200).json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Error' });
    }
});

router.get('/check-status', (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
    res.json({ success: true });
});

module.exports = router;
