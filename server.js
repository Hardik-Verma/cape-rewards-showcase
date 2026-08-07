require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');
const bot = require('./bot/client');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes (Allows InfinityFree to talk to Render)
app.use(cors());
app.use(express.json());

// Dynamically inject GOOGLE_CLIENT_ID into auth pages for instant loading
const fs = require('fs');
app.get(['/login.html', '/register.html'], (req, res, next) => {
    try {
        let html = fs.readFileSync(path.join(__dirname, 'public', req.path), 'utf8');
        const injection = `<script>window.GOOGLE_CLIENT_ID = "${process.env.GOOGLE_CLIENT_ID || ''}";</script>`;
        html = html.replace('<head>', '<head>' + injection);
        res.send(html);
    } catch (e) {
        next();
    }
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', apiRoutes);

// Catch-all 404 handler
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
