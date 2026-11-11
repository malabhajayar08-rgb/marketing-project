/* Lumen — Admin Dashboard */

const API = 'http://localhost:3001/api';

const views = {
    dashboard: document.getElementById('view-dashboard'),
    campaigns: document.getElementById('view-campaigns'),
    leads: document.getElementById('view-leads'),
};
const links = document.querySelectorAll('.sidebar__link');
const pageTitle = document.getElementById('pageTitle');

async function fetchJSON(path, opts = {}) {
    const res = await fetch(`${API}${path}`, {
        headers: { 'Content-Type': 'application/json', ...opts.headers },
        ...opts,
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
}

function showView(name) {
    Object.values(views).forEach(v => v.classList.remove('view--active'));
    links.forEach(l => l.classList.toggle('sidebar__link--active', l.dataset.view === name));
    views[name].classList.add('view--active');
    pageTitle.textContent = name.charAt(0).toUpperCase() + name.slice(1);
}

links.forEach(l => {
    l.addEventListener('click', e => {
        e.preventDefault();
        showView(l.dataset.view);
        loadViewData(l.dataset.view);
    });
});

async function loadDashboard() {
    try {
        const stats = await fetchJSON('/dashboard/stats');
        document.getElementById('stat-campaigns').textContent = stats.totalCampaigns;
        document.getElementById('stat-active').textContent = stats.activeCampaigns;
        document.getElementById('stat-spend').textContent = '$' + stats.totalSpend.toLocaleString();
        document.getElementById('stat-leads').textContent = stats.totalLeads;

        const campaigns = await fetchJSON('/campaigns');
        const recent = campaigns.slice(0, 5);
        const tbody = document.querySelector('#recentTable tbody');
        tbody.innerHTML = recent.map(c => `
            <tr>
                <td>${c.name}</td>
                <td><span class="status-badge status-${c.status}">${c.status}</span></td>
                <td>$${Number(c.spend || 0).toLocaleString()}</td>
                <td>${c.conversions || 0}</td>
            </tr>
        `).join('');

        const leads = await fetchJSON('/leads');
        const recentLeads = leads.slice(0, 5);
        const ltbody = document.querySelector('#leadsTable tbody');
        ltbody.innerHTML = recentLeads.map(l => `
            <tr>
                <td>${l.name}</td>
                <td>${l.email}</td>
                <td>${l.plan || '-'}</td>
                <td><span class="status-badge status-${l.status}">${l.status}</span></td>
            </tr>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

async function loadCampaigns() {
    try {
        const campaigns = await fetchJSON('/campaigns');
        const tbody = document.querySelector('#campaignsTable tbody');
        tbody.innerHTML = campaigns.map(c => `
            <tr>
                <td>${c.name}</td>
                <td><span class="status-badge status-${c.status}">${c.status}</span></td>
                <td>${c.channel || '-'}</td>
                <td>$${Number(c.budget || 0).toLocaleString()}</td>
                <td>$${Number(c.spend || 0).toLocaleString()}</td>
                <td>${Number(c.impressions || 0).toLocaleString()}</td>
                <td>${Number(c.clicks || 0).toLocaleString()}</td>
                <td>${Number(c.conversions || 0).toLocaleString()}</td>
                <td>
                    <button class="btn btn--outline btn--sm" onclick="window.editCampaign(${c.id})">Edit</button>
                    <button class="btn btn--outline btn--sm" style="color: var(--color-danger)" onclick="window.deleteCampaign(${c.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

async function loadLeads() {
    try {
        const leads = await fetchJSON('/leads');
        const tbody = document.querySelector('#allLeadsTable tbody');
        tbody.innerHTML = leads.map(l => `
            <tr>
                <td>${l.name}</td>
                <td>${l.email}</td>
                <td>${l.company || '-'}</td>
                <td>${l.plan || '-'}</td>
                <td>${l.source}</td>
                <td>
                    <select class="form__select status-select" data-id="${l.id}" value="${l.status}" style="width: 110px; padding: 6px 10px; font-size: 0.85rem;">
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="converted">Converted</option>
                        <option value="lost">Lost</option>
                    </select>
                </td>
                <td></td>
            </tr>
        `).join('');

        document.querySelectorAll('.status-select').forEach(sel => {
            sel.addEventListener('change', async () => {
                const id = sel.dataset.id;
                await fetchJSON(`/leads/${id}/status`, {
                    method: 'PUT',
                    body: JSON.stringify({ status: sel.value }),
                });
            });
        });
    } catch (err) {
        console.error(err);
    }
}

async function loadViewData(name) {
    if (name === 'dashboard') await loadDashboard();
    else if (name === 'campaigns') await loadCampaigns();
    else if (name === 'leads') await loadLeads();
}

let editingCampaignId = null;

window.editCampaign = async (id) => {
    const c = await fetchJSON(`/campaigns/${id}`);
    editingCampaignId = id;
    document.getElementById('modalTitle').textContent = 'Edit campaign';
    document.getElementById('campaignForm').name.value = c.name;
    document.getElementById('campaignForm').status.value = c.status;
    document.getElementById('campaignForm').channel.value = c.channel || '';
    document.getElementById('campaignForm').budget.value = c.budget || 0;
    document.getElementById('campaignModal').style.display = 'flex';
    requestAnimationFrame(() => document.getElementById('campaignModal').classList.add('show'));
};

window.deleteCampaign = async (id) => {
    if (!confirm('Delete this campaign?')) return;
    await fetchJSON(`/campaigns/${id}`, { method: 'DELETE' });
    loadCampaigns();
    loadDashboard();
};

const campaignModal = document.getElementById('campaignModal');
const modalClose = document.getElementById('modalClose');
const modalCancel = document.getElementById('modalCancelBtn');
const campaignForm = document.getElementById('campaignForm');
const addCampaignBtn = document.getElementById('addCampaignBtn');

function openModal() {
    editingCampaignId = null;
    document.getElementById('modalTitle').textContent = 'New campaign';
    campaignForm.reset();
    campaignModal.style.display = 'flex';
    requestAnimationFrame(() => campaignModal.classList.add('show'));
}
function closeModal() {
    campaignModal.classList.remove('show');
    setTimeout(() => { campaignModal.style.display = 'none'; editingCampaignId = null; }, 300);
}

addCampaignBtn.addEventListener('click', openModal);
modalClose.addEventListener('click', closeModal);
modalCancel.addEventListener('click', closeModal);

campaignForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(campaignForm);
    const data = Object.fromEntries(formData.entries());
    data.budget = Number(data.budget || 0);
    try {
        if (editingCampaignId) {
            await fetchJSON(`/campaigns/${editingCampaignId}`, { method: 'PUT', body: JSON.stringify(data) });
        } else {
            await fetchJSON('/campaigns', { method: 'POST', body: JSON.stringify(data) });
        }
        closeModal();
        loadCampaigns();
        loadDashboard();
    } catch (err) {
        alert('Failed to save campaign: ' + err.message);
    }
});

document.getElementById('adminSignout').addEventListener('click', () => {
    localStorage.removeItem('lumen_token');
    localStorage.removeItem('lumen_user');
    window.location.href = 'index.html';
});
document.getElementById('adminSignoutSidebar').addEventListener('click', () => {
    localStorage.removeItem('lumen_token');
    localStorage.removeItem('lumen_user');
    window.location.href = 'index.html';
});

showView('dashboard');
loadDashboard();
