const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE,
            password_hash TEXT,
            google_id TEXT UNIQUE,
            is_verified BOOLEAN DEFAULT 0,
            role TEXT DEFAULT 'user',
            banned BOOLEAN DEFAULT 0,
            balance INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS items (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            cost INTEGER NOT NULL,
            image TEXT NOT NULL,
            stock INTEGER DEFAULT -1
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS verification_codes (
            email TEXT PRIMARY KEY,
            code TEXT NOT NULL,
            expires_at DATETIME NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS survey_sessions (
            session_id TEXT PRIMARY KEY,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed BOOLEAN DEFAULT 0
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            balance INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            token TEXT NOT NULL,
            points INTEGER DEFAULT 0,
            timestamp INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    `);

    // Seed default admin if not exists
    const bcrypt = require('bcryptjs');
    db.get("SELECT id FROM users WHERE username = 'admin'", async (err, row) => {
        if (!row) {
            const hash = await bcrypt.hash('XqV7kL2mP9rD4wJc', 10);
            db.run("INSERT INTO users (username, password_hash, is_verified, role) VALUES ('admin', ?, 1, 'admin')", [hash]);
            console.log("Default admin account seeded.");
        }
    });

    // Seed default items if items table is empty
    db.get("SELECT COUNT(*) as count FROM items", (err, row) => {
        if (row && row.count === 0) {
            const stmt = db.prepare("INSERT INTO items (id, name, type, cost, image, stock) VALUES (?, ?, ?, ?, ?, ?)");
            stmt.run('giveaway', 'Capeverse Giveaway Entry', 'Digital Cosmetic', 50, '/logo.png', -1);
            stmt.run('moonlight', 'Moonlight Trail Cape', 'Digital Cosmetic', 1000, '/moonlight.webp', -1);
            stmt.run('crafter', 'Crafter Cape', 'Digital Cosmetic', 1500, '/crafter.webp', -1);
            stmt.finalize();
            console.log("Default items seeded.");
        }
    });
});

module.exports = db;
