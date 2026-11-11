const path = require('path');
const Database = require('sqlite3').Database;

const dbPath = path.join(__dirname, 'lumen.db');
const db = new Database(dbPath);

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve({ id: this.lastID, changes: this.changes });
        });
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

async function init() {
    await run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await run(`CREATE TABLE IF NOT EXISTS campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        channel TEXT,
        budget REAL DEFAULT 0,
        spend REAL DEFAULT 0,
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        start_date TEXT,
        end_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await run(`CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        company TEXT,
        plan TEXT,
        message TEXT,
        source TEXT DEFAULT 'website',
        status TEXT DEFAULT 'new',
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Add user_id column to existing leads tables if missing
    try {
        await run(`ALTER TABLE leads ADD COLUMN user_id INTEGER`);
    } catch (e) {
        // Column may already exist
    }

    await run(`CREATE TABLE IF NOT EXISTS analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER,
        date TEXT NOT NULL,
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        spend REAL DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
    )`);

    // Seed default admin user
    const existing = await get('SELECT id FROM users WHERE email = ?', ['admin@lumen.io']);
    if (!existing) {
        await run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            ['Admin User', 'admin@lumen.io', 'admin123', 'admin']);
    }

    // Seed sample campaigns
    const count = await get('SELECT COUNT(*) as c FROM campaigns');
    if (count.c === 0) {
        const now = new Date();
        const campaigns = [
            ['Q4 Holiday Campaign', 'active', 'social', 5000, 3200, 125000, 4500, 180, '2026-10-01', '2026-12-31'],
            ['Product Launch Email', 'active', 'email', 2000, 1400, 85000, 3200, 95, '2026-11-01', '2026-11-30'],
            ['Brand Awareness Display', 'paused', 'display', 8000, 4100, 210000, 2100, 60, '2026-11-15', '2026-12-15'],
            ['Retargeting Ads', 'active', 'social', 3000, 1850, 62000, 2900, 110, '2026-10-15', '2026-12-15'],
        ];
        for (const c of campaigns) {
            await run(`INSERT INTO campaigns (name, status, channel, budget, spend, impressions, clicks, conversions, start_date, end_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, c);
        }
    }
}

module.exports = { db, run, all, get, init };
