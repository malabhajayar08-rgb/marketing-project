const express = require('express');
const cors = require('cors');
const path = require('path');
const { init, all, get, run, db } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Dashboard stats
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const totalCampaigns = await get('SELECT COUNT(*) as c FROM campaigns');
        const activeCampaigns = await get("SELECT COUNT(*) as c FROM campaigns WHERE status = 'active'");
        const totalSpend = await get('SELECT COALESCE(SUM(spend), 0) as total FROM campaigns');
        const totalImpressions = await get('SELECT COALESCE(SUM(impressions), 0) as total FROM campaigns');
        const totalClicks = await get('SELECT COALESCE(SUM(clicks), 0) as total FROM campaigns');
        const totalConversions = await get('SELECT COALESCE(SUM(conversions), 0) as total FROM campaigns');
        const totalLeads = await get('SELECT COUNT(*) as c FROM leads');
        const newLeads = await get("SELECT COUNT(*) as c FROM leads WHERE status = 'new'");

        const ctr = totalImpressions.total > 0 ? ((totalClicks.total / totalImpressions.total) * 100).toFixed(2) : 0;
        const cvr = totalClicks.total > 0 ? ((totalConversions.total / totalClicks.total) * 100).toFixed(2) : 0;

        res.json({
            totalCampaigns: totalCampaigns.c,
            activeCampaigns: activeCampaigns.c,
            totalSpend: totalSpend.total,
            totalImpressions: totalImpressions.total,
            totalClicks: totalClicks.total,
            totalConversions: totalConversions.total,
            totalLeads: totalLeads.c,
            newLeads: newLeads.c,
            ctr: parseFloat(ctr),
            cvr: parseFloat(cvr),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// List campaigns
app.get('/api/campaigns', async (req, res) => {
    try {
        const campaigns = await all('SELECT * FROM campaigns ORDER BY created_at DESC');
        res.json(campaigns);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get single campaign
app.get('/api/campaigns/:id', async (req, res) => {
    try {
        const campaign = await get('SELECT * FROM campaigns WHERE id = ?', [req.params.id]);
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
        res.json(campaign);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create campaign
app.post('/api/campaigns', async (req, res) => {
    try {
        const { name, status, channel, budget, start_date, end_date } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });
        const result = await run(
            `INSERT INTO campaigns (name, status, channel, budget, start_date, end_date)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, status || 'draft', channel || '', budget || 0, start_date || null, end_date || null]
        );
        const campaign = await get('SELECT * FROM campaigns WHERE id = ?', [result.id]);
        res.status(201).json(campaign);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update campaign
app.put('/api/campaigns/:id', async (req, res) => {
    try {
        const { name, status, channel, budget, spend, impressions, clicks, conversions, start_date, end_date } = req.body;
        await run(
            `UPDATE campaigns SET name = ?, status = ?, channel = ?, budget = ?, spend = ?, impressions = ?, clicks = ?, conversions = ?, start_date = ?, end_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [name, status, channel, budget, spend, impressions, clicks, conversions, start_date, end_date, req.params.id]
        );
        const campaign = await get('SELECT * FROM campaigns WHERE id = ?', [req.params.id]);
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
        res.json(campaign);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete campaign
app.delete('/api/campaigns/:id', async (req, res) => {
    try {
        const result = await run('DELETE FROM campaigns WHERE id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ error: 'Campaign not found' });
        res.json({ message: 'Campaign deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// List leads
app.get('/api/leads', async (req, res) => {
    try {
        const { user_id } = req.query;
        let leads;
        if (user_id) {
            leads = await all('SELECT * FROM leads WHERE user_id = ? ORDER BY created_at DESC', [user_id]);
        } else {
            leads = await all('SELECT * FROM leads ORDER BY created_at DESC');
        }
        res.json(leads);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create lead (from website form)
app.post('/api/leads', async (req, res) => {
    try {
        const { name, email, company, plan, message, source, user_id } = req.body;
        if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });
        const result = await run(
            `INSERT INTO leads (name, email, company, plan, message, source, user_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, email, company || '', plan || '', message || '', source || 'website', user_id || null]
        );
        const lead = await get('SELECT * FROM leads WHERE id = ?', [result.id]);
        res.status(201).json(lead);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update lead status
app.put('/api/leads/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        await run('UPDATE leads SET status = ? WHERE id = ?', [status, req.params.id]);
        const lead = await get('SELECT * FROM leads WHERE id = ?', [req.params.id]);
        if (!lead) return res.status(404).json({ error: 'Lead not found' });
        res.json(lead);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Analytics over time
app.get('/api/analytics', async (req, res) => {
    try {
        const rows = await all(`
            SELECT date, SUM(impressions) as impressions, SUM(clicks) as clicks, SUM(spend) as spend, SUM(conversions) as conversions
            FROM analytics GROUP BY date ORDER BY date ASC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login (simple)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await get('SELECT id, name, email, role FROM users WHERE email = ? AND password = ?', [email, password]);
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        res.json({ user, token: 'demo-token-' + user.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Register (simple)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });
        const existing = await get('SELECT id FROM users WHERE email = ?', [email]);
        if (existing) return res.status(409).json({ error: 'Email already registered' });
        const result = await run(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, password, 'user']
        );
        const user = await get('SELECT id, name, email, role FROM users WHERE id = ?', [result.id]);
        res.status(201).json({ user, token: 'demo-token-' + user.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Verify session
app.get('/api/auth/me', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(401).json({ error: 'No token' });
        const userId = token.replace('demo-token-', '');
        const user = await get('SELECT id, name, email, role FROM users WHERE id = ?', [userId]);
        if (!user) return res.status(401).json({ error: 'Invalid token' });
        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start server
init().then(() => {
    app.listen(PORT, () => {
        console.log(`Lumen marketing system running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
