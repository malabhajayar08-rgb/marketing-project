/* Lumen — User Dashboard */

const API = 'http://localhost:3001/api';

const userNameEl = document.getElementById('userName');
const userFirstNameEl = document.getElementById('userFirstName');
const signoutBtn = document.getElementById('signoutBtn');

const token = localStorage.getItem('lumen_token');
const storedUser = localStorage.getItem('lumen_user');

async function checkAuth() {
    if (!token || !storedUser) {
        window.location.href = 'index.html';
        return;
    }
    try {
        const res = await fetch(`${API}/auth/me?token=${token}`);
        if (!res.ok) throw new Error('Invalid session');
        const data = await res.json();
        const user = data.user;
        userNameEl.textContent = user.name;
        userFirstNameEl.textContent = user.name.split(' ')[0];
        localStorage.setItem('lumen_user', JSON.stringify(user));
        localStorage.setItem('lumen_token', token);
    } catch (err) {
        localStorage.removeItem('lumen_token');
        localStorage.removeItem('lumen_user');
        window.location.href = 'index.html';
    }
}

signoutBtn.addEventListener('click', () => {
    localStorage.removeItem('lumen_token');
    localStorage.removeItem('lumen_user');
    window.location.href = 'index.html';
});

async function fetchJSON(path, opts = {}) {
    const res = await fetch(`${API}${path}`, {
        headers: { 'Content-Type': 'application/json', ...opts.headers },
        ...opts,
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
}

async function loadUserData() {
    try {
        const user = JSON.parse(localStorage.getItem('lumen_user') || '{}');
        const leads = await fetchJSON(`/leads?user_id=${user.id}`);

        document.getElementById('stat-leads').textContent = leads.length;
        document.getElementById('stat-pending').textContent = leads.filter(l => l.status === 'new').length;
        document.getElementById('stat-contacted').textContent = leads.filter(l => l.status === 'contacted').length;
        document.getElementById('stat-converted').textContent = leads.filter(l => l.status === 'converted').length;

        const tbody = document.getElementById('leadsTableBody');
        if (leads.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center; padding: 48px; color: var(--color-muted);">
                        No submissions yet. Your website form leads will appear here.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = leads.map(l => `
            <tr>
                <td>${l.name || '-'}</td>
                <td>${l.email || '-'}</td>
                <td>${l.company || '-'}</td>
                <td>${l.plan || '-'}</td>
                <td><span class="status-badge status-${l.status}">${l.status}</span></td>
            </tr>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

checkAuth().then(() => loadUserData());
