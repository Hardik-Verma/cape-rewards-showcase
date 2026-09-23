const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Item, VerificationCode, Order, Postback, SiteConfig } = require('../database/db');
const { OAuth2Client } = require('google-auth-library');
const JWT_SECRET = process.env.JWT_SECRET || 'capeverse-super-secret-key';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Public config endpoint (no auth) - used by login, register, claim, history pages
router.get('/config', async (req, res) => {
    let discordInviteLink = process.env.DISCORD_INVITE_LINK || 'https://discord.gg/tgCFxYD948';
    let offerwallValid = false;
    try {
        const config = await SiteConfig.findOne();
        if (config && config.discordInviteLink) discordInviteLink = config.discordInviteLink;
        const raw = (config?.bitcotasksOfferwallUrl || process.env.BITCOTASKS_URL || '').trim();
        if (raw) {
            const hasPlaceholder = /(\[[^\]]*\]|YOUR_|API_?KEY|OFFERWALL_ID|\{uid\}|\{user_id\}|example|demo)/i.test(raw);
            const m = raw.match(/^(https?:\/\/[^/]+)\/offerwall\/([^/\s?#]+)/i);
            const key = m ? m[2] : '';
            offerwallValid = !hasPlaceholder && !!m && /^[A-Za-z0-9_\-]{8,64}$/.test(key);
        }
    } catch (e) {
        console.error('Error loading site config:', e);
    }
    res.json({
        googleClientId: process.env.GOOGLE_CLIENT_ID || '',
        discordInviteLink,
        offerwallValid
    });
});

// Server-side only helper: build the canonical Bitcotasks offerwall URL from DB config.
// The API key is held here and NEVER returned to the browser.
async function buildOfferwallUrl(userId) {
    try {
        const config = await SiteConfig.findOne();
        const raw = (config?.bitcotasksOfferwallUrl || process.env.BITCOTASKS_URL || '').trim();
        if (!raw) return { valid: false, reason: 'empty' };
        const hasPlaceholder = /(\[[^\]]*\]|YOUR_|API_?KEY|OFFERWALL_ID|\{uid\}|\{user_id\}|example|demo)/i.test(raw);
        const m = raw.match(/^(https?:\/\/[^/]+)\/offerwall\/([^/\s?#]+)/i);
        const origin = m ? m[1] : '';
        const key = m ? m[2] : '';
        if (hasPlaceholder || !m || !/^[A-Za-z0-9_\-]{8,64}$/.test(key)) {
            return { valid: false, reason: 'badkey' };
        }
        return { valid: true, url: `${origin}/offerwall/${key}/${userId}` };
    } catch (e) {
        console.error('Error building offerwall URL:', e);
        return { valid: false, reason: 'error' };
    }
}

// Safe status check (no secret data) so the page can show a config warning
router.get('/offerwall/status', authenticateToken, async (req, res) => {
    try {
        const config = await SiteConfig.findOne();
        const raw = (config?.bitcotasksOfferwallUrl || process.env.BITCOTASKS_URL || '').trim();
        if (!raw) return res.json({ valid: false, reason: 'empty' });
        const hasPlaceholder = /(\[[^\]]*\]|YOUR_|API_?KEY|OFFERWALL_ID|\{uid\}|\{user_id\}|example|demo)/i.test(raw);
        const m = raw.match(/^(https?:\/\/[^/]+)\/offerwall\/([^/\s?#]+)/i);
        const key = m ? m[2] : '';
        if (hasPlaceholder || !m || !/^[A-Za-z0-9_\-]{8,64}$/.test(key)) {
            return res.json({ valid: false, reason: 'badkey' });
        }
        res.json({ valid: true });
    } catch (e) {
        res.json({ valid: false, reason: 'error' });
    }
});

// Short-lived, offerwall-scoped ticket — keeps the user's session JWT out of the iframe URL
router.get('/offerwall/ticket', authenticateToken, (req, res) => {
    const ticket = jwt.sign({ id: req.user.id, scope: 'offerwall' }, JWT_SECRET, { expiresIn: '2m' });
    res.json({ ticket });
});

// Offerwall gateway: keeps the API key on the server and 302s the iframe to
// Bitcotasks, so the key never appears in our HTML, JS, DOM or API config.
router.get('/offerwall/go', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Referrer-Policy', 'no-referrer');
    res.set('X-Robots-Tag', 'noindex, nofollow');

    const raw = req.query.ticket || req.query.token || (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || '';
    if (!raw) return res.status(401).send('Not authorized');

    let userId;
    try {
        const payload = jwt.verify(raw, JWT_SECRET);
        if (payload.scope && payload.scope !== 'offerwall') return res.status(403).send('Invalid ticket scope');
        userId = payload.id;
    } catch (e) {
        return res.status(401).send('Not authorized');
    }

    const built = await buildOfferwallUrl(userId);
    if (!built.valid) return res.status(500).send('Offerwall is not configured correctly.');
    res.redirect(302, built.url);
});

// GET site config (public-safe fields; only what's needed by logged-in admins)
router.get('/config/site', authenticateToken, async (req, res) => {
    try {
        const config = await SiteConfig.findOne();
        res.json({ success: true, discordInviteLink: (config && config.discordInviteLink) || process.env.DISCORD_INVITE_LINK || '' });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

// POST site config (admin only) - lets admin update the invite link without editing code
router.post('/config/site', authenticateAdmin, async (req, res) => {
    const { discordInviteLink } = req.body;
    if (!discordInviteLink || !/^https?:\/\//.test(discordInviteLink)) {
        return res.status(400).json({ error: 'A valid invite link (http/https) is required' });
    }
    try {
        await SiteConfig.findOneAndUpdate(
            {},
            { discordInviteLink, updatedAt: Date.now() },
            { upsert: true, new: true }
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

// POST postback secret (admin only) - stores the Bitcotasks Secret Key used for MD5 signature verification
router.post('/config/postback', authenticateAdmin, async (req, res) => {
    const { postbackSecret } = req.body;
    if (!postbackSecret || postbackSecret.length < 6) {
        return res.status(400).json({ error: 'A secret key of at least 6 characters is required' });
    }
    try {
        await SiteConfig.findOneAndUpdate(
            {},
            { postbackSecret, updatedAt: Date.now() },
            { upsert: true, new: true }
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

// GET Bitcotasks config (admin only)
router.get('/config/bitcotasks', authenticateAdmin, async (req, res) => {
    try {
        const config = await SiteConfig.findOne();
        res.json({ 
            success: true, 
            apiKey: (config && config.bitcotasksApiKey) || '',
            offerwallUrl: (config && config.bitcotasksOfferwallUrl) || '',
            postbackSecret: (config && config.postbackSecret) || ''
        });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

// POST Bitcotasks config (admin only)
router.post('/config/bitcotasks', authenticateAdmin, async (req, res) => {
    const { apiKey, offerwallUrl, postbackSecret } = req.body;
    try {
        await SiteConfig.findOneAndUpdate(
            {},
            { 
                bitcotasksApiKey: apiKey || '',
                bitcotasksOfferwallUrl: offerwallUrl || '',
                postbackSecret: postbackSecret || '',
                updatedAt: Date.now() 
            },
            { upsert: true, new: true }
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Public legal pages - only ToS/Privacy body text, never any secrets
router.get('/legal', async (req, res) => {
    try {
        const config = await SiteConfig.findOne();
        res.json({ tos: (config && config.tosContent) || '', privacy: (config && config.privacyContent) || '' });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Admin: read current legal drafts
router.get('/config/legal', authenticateAdmin, async (req, res) => {
    try {
        const config = await SiteConfig.findOne();
        res.json({ success: true, tos: (config && config.tosContent) || '', privacy: (config && config.privacyContent) || '' });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Admin: save ToS / Privacy content (raw HTML, admin-trusted)
router.post('/config/legal', authenticateAdmin, async (req, res) => {
    const { tos, privacy } = req.body;
    if (typeof tos !== 'string' || typeof privacy !== 'string') {
        return res.status(400).json({ error: 'tos and privacy must be strings' });
    }
    if (tos.length > 50000 || privacy.length > 50000) {
        return res.status(400).json({ error: 'Content too long (max 50,000 characters)' });
    }
    try {
        await SiteConfig.findOneAndUpdate(
            {},
            { tosContent: tos, privacyContent: privacy, updatedAt: Date.now() },
            { upsert: true, new: true }
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

// PROXY / VPN DETECTION - uses free ip-api.com endpoint (no key required)
router.get('/proxy-check', async (req, res) => {
    try {
        const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || '';
        if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127')) {
            return res.json({ success: true, ip, proxy: false, hosting: false });
        }

        const apiRes = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,proxy,hosting,country,query`, { signal: AbortSignal.timeout(5000) });
        const data = await apiRes.json();

        if (data.status === 'fail') {
            return res.json({ success: true, ip, proxy: false, hosting: false });
        }

        res.json({
            success: true,
            ip: data.query || ip,
            country: data.country || 'Unknown',
            proxy: !!data.proxy,
            hosting: !!data.hosting,
            blocked: !!(data.proxy || data.hosting)
        });
    } catch (e) {
        console.error('Proxy check error:', e);
        res.json({ success: true, ip: '', proxy: false, hosting: false, blocked: false });
    }
});

// Brevo API keep-alive to prevent 90-day expiration
if (process.env.BREVO_API_KEY) {
    const keepBrevoAlive = async () => {
        try {
            await fetch('https://api.brevo.com/v3/account', {
                method: 'GET',
                headers: { 'api-key': process.env.BREVO_API_KEY }
            });
            console.log('Brevo API key keep-alive ping successful.');
        } catch (e) {
            console.error('Brevo API key keep-alive ping failed.');
        }
    };
    keepBrevoAlive(); // Run once on startup
    setInterval(keepBrevoAlive, 24 * 60 * 60 * 1000); // Run every 24 hours
}

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

const getOpEmailTemplate = (code, title) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
</head>
<body style="margin: 0; padding: 0; background-color: #050505; font-family: Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #050505; padding: 40px 10px;">
        <tr>
            <td align="center">
                <!-- Main Card -->
                <table width="100%" max-width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #111111; border: 1px solid #222222; border-top: 4px solid #ff0000; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td align="center" style="padding: 40px 20px;">
                            <div style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #ffffff; text-transform: uppercase; margin-bottom: 30px;">CAPEVERSE<span style="color: #ff0000;">.</span></div>
                            <h1 style="margin: 0 0 10px 0; font-size: 24px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 2px;">${title}</h1>
                            <p style="margin: 0 0 35px 0; font-size: 14px; color: #888888; line-height: 1.5;">Use the secure verification code below to proceed. Do not share this code with anyone.</p>
                            
                            <!-- Code Box -->
                            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto; background-color: #1a0505; border: 2px solid #ff0000; border-radius: 8px;">
                                <tr>
                                    <td align="center" style="padding: 20px 40px;">
                                        <span style="font-size: 36px; font-weight: 900; color: #ff3333; letter-spacing: 12px; font-family: monospace;">${code}</span>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 35px 0 0 0; font-size: 12px; color: #555555; line-height: 1.5;">This code will expire in 15 minutes.<br>If you did not request this, you can safely ignore this email.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

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

        if (!process.env.BREVO_API_KEY) {
            console.log(`[MOCK EMAIL] OTP for ${email} is ${code}`);
            return res.json({ success: true, message: 'Check console for mock OTP' });
        }

        const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: {
                    name: 'Capeverse',
                    email: process.env.SENDER_EMAIL || 'capeverse.noreply@gmail.com'
                },
                to: [{ email: email }],
                subject: 'Capeverse Verification Code',
                htmlContent: getOpEmailTemplate(code, 'Account Verification')
            })
        });

        if (brevoRes.ok) {
            res.json({ success: true, message: 'OTP sent' });
        } else {
            const errData = await brevoRes.json();
            console.error('Brevo Error:', errData);
            res.status(500).json({ error: 'Failed to send email via API' });
        }
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'No account found with that email' });
        if (!user.password_hash) return res.status(400).json({ error: 'This account uses Google Sign-In' });

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        await VerificationCode.findOneAndUpdate(
            { email },
            { code, expires_at: expires },
            { upsert: true, new: true }
        );

        if (!process.env.BREVO_API_KEY) {
            console.log(`[MOCK EMAIL] Reset OTP for ${email} is ${code}`);
            return res.json({ success: true, message: 'Check console for mock OTP' });
        }

        const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: { name: 'Capeverse', email: process.env.SENDER_EMAIL || 'capeverse.noreply@gmail.com' },
                to: [{ email: email }],
                subject: 'Capeverse Password Reset',
                htmlContent: getOpEmailTemplate(code, 'Password Reset')
            })
        });

        if (brevoRes.ok) return res.json({ success: true });
        res.status(500).json({ error: 'Failed to send email via API' });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/auth/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ error: 'All fields required' });

    try {
        const row = await VerificationCode.findOne({ email });
        if (!row || row.code !== otp || new Date(row.expires_at) < new Date()) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.findOneAndUpdate({ email }, { password_hash: hashedPassword });
        await VerificationCode.deleteOne({ email });
        
        res.json({ success: true });
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
        const user = await User.create({ username, email, password_hash: hashedPassword, is_verified: true });
        await VerificationCode.deleteOne({ email });
        
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ success: true, message: 'User registered', token, role: user.role });
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

// --- PROFILE SECURITY (EMAIL / PASSWORD) ---

// Change password (requires the current password; no 2FA needed)
router.post('/profile/password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'All fields required' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
    if (currentPassword === newPassword) return res.status(400).json({ error: 'New password must be different from the current one' });

    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (!user.password_hash) return res.status(400).json({ error: 'This account uses Google Sign-In' });

        const valid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

        user.password_hash = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ success: true, message: 'Password updated' });
    } catch (e) {
        console.error('Profile password error:', e);
        res.status(500).json({ error: 'Database error' });
    }
});

// Change email (requires the current password; email must be unique)
router.post('/profile/email', authenticateToken, async (req, res) => {
    const { password, email } = req.body;
    if (!password || !email) return res.status(400).json({ error: 'All fields required' });
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) return res.status(400).json({ error: 'Invalid email address' });

    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (!user.password_hash) return res.status(400).json({ error: 'This account uses Google Sign-In' });

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Password is incorrect' });

        const existing = await User.findOne({ email, _id: { $ne: user._id } });
        if (existing) return res.status(400).json({ error: 'That email is already in use' });

        user.email = email;
        await user.save();

        res.json({ success: true, message: 'Email updated' });
    } catch (e) {
        console.error('Profile email error:', e);
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
    const { id, name, type, cost, image, stock, autoDeliver } = req.body;
    try {
        await Item.findOneAndUpdate({ id }, { name, type, cost, image, stock, autoDeliver: !!autoDeliver }, { upsert: true });
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

        const isUnlimited = item.stock === -1;
        if (!isUnlimited && item.stock <= 0) return res.status(400).json({ error: 'Out of stock' });
        if (user.balance < item.cost) return res.status(400).json({ error: 'Not enough points' });

        user.balance -= item.cost;
        await user.save();

        if (!isUnlimited && item.stock > 0) {
            item.stock -= 1;
            await item.save();
        }

        const timestamp = Date.now();

        const isAutoDeliver = !!item.autoDeliver;
        
        // Generate secure random code for capes (non-auto-deliver items)
        let redeemCode = null;
        if (!isAutoDeliver) {
            const randomPart = crypto.randomBytes(6).toString('hex').toUpperCase();
            redeemCode = 'CAPE-' + randomPart.match(/.{1,4}/g).join('-'); // CAPE-A1B2-C3D4-E5F6
        }

        const order = await Order.create({ 
            user_id: user._id, 
            name: item.name, 
            token: uuidv4(), 
            points: item.cost, 
            timestamp,
            redeemed: isAutoDeliver,
            redeemCode
        });

        const orderRef = String(order._id).slice(-8).toUpperCase();
        if (isAutoDeliver) {
            res.json({ success: true, orderRef, autoDelivered: true, message: 'Entry submitted automatically — no ticket needed!' });
        } else {
            res.json({ success: true, orderRef, redeemCode });
        }
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

router.get('/history', authenticateToken, async (req, res) => {
    try {
        const rows = await Order.find({ user_id: req.user.id }).sort({ timestamp: -1 });
        const history = rows.map(r => ({ id: r._id, name: r.name, token: r.token, points: r.points, timestamp: r.timestamp, redeemed: !!r.redeemed, date: new Date(r.timestamp).toLocaleDateString() }));
        res.json({ success: true, history });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

router.delete('/history/:id', authenticateToken, async (req, res) => {
    try {
        await Order.deleteOne({ _id: req.params.id, user_id: req.user.id });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

router.delete('/history', authenticateToken, async (req, res) => {
    try {
        await Order.deleteMany({ user_id: req.user.id });
        res.json({ success: true });
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

// --- ADMIN ORDERS ENDPOINTS ---

router.get('/admin/orders', authenticateAdmin, async (req, res) => {
    try {
        const rows = await Order.find({}).sort({ timestamp: -1 }).limit(200);
        const userIds = [...new Set(rows.map(r => r.user_id))];
        const users = await User.find({ _id: { $in: userIds } }).select('_id username');
        const userMap = {};
        users.forEach(u => { userMap[String(u._id)] = u.username; });
        const orders = rows.map(r => ({
            id: r._id,
            username: userMap[String(r.user_id)] || 'Unknown',
            name: r.name,
            points: r.points,
            redeemed: !!r.redeemed,
            redeemCode: r.redeemCode || null,
            date: new Date(r.timestamp).toLocaleDateString()
        }));
        res.json({ success: true, orders });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/admin/orders/:id/deliver', authenticateAdmin, async (req, res) => {
    try {
        await Order.findByIdAndUpdate(req.params.id, { redeemed: true, redeemed_by: req.user.username || req.user.email || 'admin' });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/admin/users/:id/points', authenticateAdmin, async (req, res) => {
    const amount = parseInt(req.body.amount, 10);
    if (isNaN(amount)) return res.status(400).json({ error: 'Invalid amount' });
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { $inc: { balance: amount } }, { new: true });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true, newBalance: user.balance });
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

// --- BITCOTASKS S2S POSTBACK ---
// Spec: GET/POST to postback URL with params:
//   subId, transId, reward, status (1=credit, 2=chargeback), signature
// Signature = md5(subId + transId + reward + SECRET_KEY)
// MUST respond with exactly "ok" (lowercase) or Bitcotasks recovers/retries.
router.all('/postback', async (req, res) => {
    console.log('=== POSTBACK RECEIVED ===', { method: req.method, query: req.query, body: req.body, headers: req.headers });
    const params = { ...req.query, ...req.body };
    const subId = params.subId || params.sub_id;
    const transId = params.transId || params.transaction_id || params.trans_id;
    const reward = params.reward || params.payout || params.amount;
    const status = parseInt(params.status) || 1;
    const signature = params.signature || '';

    console.log('POSTBACK PARSED:', { subId, transId, reward, status, hasSignature: !!signature });

    let secretKey = process.env.BITCOTASKS_SECRET || process.env.POSTBACK_SECRET;
    try {
        const config = await SiteConfig.findOne();
        if (config && config.postbackSecret) secretKey = config.postbackSecret;
    } catch (e) {
        console.error('Error loading postback secret from config:', e);
    }

    console.log('POSTBACK SECRET CHECK:', { hasEnvSecret: !!(process.env.BITCOTASKS_SECRET || process.env.POSTBACK_SECRET), hasConfigSecret: !!secretKey, secretLength: secretKey?.length });

    if (!subId) return res.status(400).send('invalid: missing subId');
    if (!transId) return res.status(400).send('invalid: missing transId');
    if (!secretKey) return res.status(500).send('invalid: server secret not configured');

    // 1) Verify MD5 signature: md5(subId + transId + reward + secretKey)
    const expectedSig = crypto.createHash('md5').update(`${subId}${transId}${reward}${secretKey}`).digest('hex');
    console.log('POSTBACK SIG CHECK:', { expectedSig, receivedSig: signature, match: signature.toLowerCase() === expectedSig.toLowerCase() });
    if (!signature || signature.toLowerCase() !== expectedSig.toLowerCase()) {
        console.error(`SIGNATURE MISMATCH: subId=${subId}, transId=${transId}, reward=${reward}, expected=${expectedSig}, received=${signature}`);
        return res.status(401).send('invalid signature');
    }

    const rewardAmount = parseFloat(reward) || 0;

    // 2) Idempotency lock: record the transaction FIRST so a retried postback
    //    (e.g. after a network timeout) can never double-credit the user.
    try {
        await Postback.create({
            transId,
            subId,
            reward: rewardAmount,
            offerName: params.offer_name || '',
            status
        });
    } catch (err) {
        if (err && err.code === 11000) return res.send('ok'); // Already processed
        console.error('POSTBACK: could not record transaction:', err);
        return res.status(500).send('internal error');
    }

    try {
        const user = await User.findById(subId);
        if (!user) {
            console.error(`POSTBACK: user not found for subId=${subId}`);
            await Postback.deleteOne({ transId }); // release lock so a retry still credits
            return res.status(404).send('invalid: user not found');
        }

        // 3) Handle credit vs chargeback
        if (status === 2) {
            user.balance = Math.max(0, user.balance - rewardAmount);
        } else {
            user.balance += rewardAmount;
        }
        await user.save();

        console.log(`POSTBACK OK: ${status === 2 ? 'CHARGEBACK' : 'CREDIT'} ${rewardAmount} pts to ${subId} (trans ${transId})`);
        res.status(200).send('ok');
    } catch (e) {
        // If the credit write failed, release the lock so a retry can re-credit.
        await Postback.deleteOne({ transId }).catch(() => {});
        console.error('DATABASE ERROR (Postback):', e);
        res.status(500).send('internal error');
    }
});

// Test postback helper (admin-only; used for manual testing). Previously public —
// it credited users without signature checks. Only signed BitcoTasks postbacks hit /postback.
router.all('/test-postback', authenticateAdmin, async (req, res) => {
    const params = { ...req.query, ...req.body };
    const subId = params.subId || params.user_id || params.uid || params.user;
    const transId = params.transId || Date.now().toString();
    const reward = params.reward || params.payout || 150;
    const status = parseInt(params.status) || 1;

    if (!subId) return res.status(400).send('Missing subId');

    try {
        await Postback.create({ transId, subId, reward: 0, offerName: 'test-lock', status });
    } catch (err) {
        if (err && err.code === 11000) return res.status(200).send('ok');
        return res.status(500).send('Error');
    }

    try {
        const user = await User.findById(subId);
        if (!user) {
            await Postback.deleteOne({ transId }).catch(() => {});
            return res.status(404).send('User not found');
        }

        const rewardAmount = parseFloat(reward) || 150;
        if (status === 2) {
            user.balance = Math.max(0, user.balance - rewardAmount);
        } else {
            user.balance += rewardAmount;
        }
        await user.save();

        await Postback.updateOne({ transId }, { reward: rewardAmount });
        res.status(200).send('ok');
    } catch (e) {
        await Postback.deleteOne({ transId }).catch(() => {});
        console.error('DATABASE ERROR (Test-Postback):', e);
        res.status(500).send('Error');
    }
});

router.get('/check-status', (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
    res.json({ success: true });
});

module.exports = router;
