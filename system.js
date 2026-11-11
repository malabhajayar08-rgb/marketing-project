/* Lumen Marketing System — Shared JavaScript */

const API = 'http://localhost:3001/api';

/* ---------- Mobile nav ---------- */
const toggle = document.getElementById('navToggle');
const links = document.getElementById('navLinks');
if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('nav__links--open'));
    document.querySelectorAll('.nav__link').forEach(a => {
        a.addEventListener('click', () => links.classList.remove('nav__links--open'));
    });
}

/* ---------- Smooth scroll for anchor links ---------- */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

/* ---------- Toast ---------- */
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const toastClose = document.getElementById('toastClose');
function showToast(msg) {
    if (!toast) return;
    toastMessage.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
}
if (toastClose) toastClose.addEventListener('click', () => toast.classList.remove('show'));

/* ---------- Auth modals ---------- */
const loginModal = document.getElementById('loginModal');
const signupModal = document.getElementById('signupModal');
const loginClose = document.getElementById('loginClose');
const signupClose = document.getElementById('signupClose');
const switchToSignup = document.getElementById('switchToSignup');
const switchToLogin = document.getElementById('switchToLogin');
const navSignIn = document.getElementById('navSignIn');
const navSignUp = document.getElementById('navSignUp');

function openLoginModal() {
    if (loginModal) { loginModal.style.display = 'flex'; requestAnimationFrame(() => loginModal.classList.add('show')); }
}
function closeLoginModal() {
    if (loginModal) { loginModal.classList.remove('show'); setTimeout(() => { loginModal.style.display = 'none'; }, 300); }
}
function openSignupModal() {
    if (signupModal) { signupModal.style.display = 'flex'; requestAnimationFrame(() => signupModal.classList.add('show')); }
}
function closeSignupModal() {
    if (signupModal) { signupModal.classList.remove('show'); setTimeout(() => { signupModal.style.display = 'none'; }, 300); }
}

if (navSignIn) navSignIn.addEventListener('click', (e) => { e.preventDefault(); openLoginModal(); });
if (navSignUp) navSignUp.addEventListener('click', (e) => { e.preventDefault(); openSignupModal(); });
if (loginClose) loginClose.addEventListener('click', closeLoginModal);
if (signupClose) signupClose.addEventListener('click', closeSignupModal);
if (document.getElementById('loginModalClose')) document.getElementById('loginModalClose').addEventListener('click', closeLoginModal);
if (document.getElementById('signupModalClose')) document.getElementById('signupModalClose').addEventListener('click', closeSignupModal);
if (switchToSignup) switchToSignup.addEventListener('click', (e) => { e.preventDefault(); closeLoginModal(); openSignupModal(); });
if (switchToLogin) switchToLogin.addEventListener('click', (e) => { e.preventDefault(); closeSignupModal(); openLoginModal(); });

async function handleAuth(endpoint, formData) {
    const res = await fetch(`${API}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Authentication failed');
    localStorage.setItem('lumen_token', data.token);
    localStorage.setItem('lumen_user', JSON.stringify(data.user));
    closeLoginModal();
    closeSignupModal();
    window.location.href = `user.html?name=${encodeURIComponent(data.user.name)}&email=${encodeURIComponent(data.user.email)}`;
}

/* ---------- Auth form on landing page ---------- */
const authForm = document.getElementById('authForm');
const authBtn = document.getElementById('authBtn');
if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const originalText = authBtn.textContent;
        authBtn.disabled = true;
        authBtn.textContent = 'Creating account...';
        try {
            await handleAuth('register', {
                name: authForm.elements.namedItem('name').value,
                email: authForm.elements.namedItem('email').value,
                password: authForm.elements.namedItem('password').value,
            });
        } catch (err) {
            showToast(err.message);
        } finally {
            authBtn.disabled = false;
            authBtn.textContent = originalText;
        }
    });
}

/* ---------- Login modal form ---------- */
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const originalText = loginBtn.textContent;
        loginBtn.disabled = true;
        loginBtn.textContent = 'Signing in...';
        try {
            await handleAuth('login', {
                email: loginForm.elements.namedItem('email').value,
                password: loginForm.elements.namedItem('password').value,
            });
        } catch (err) {
            showToast(err.message);
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = originalText;
        }
    });
}

/* ---------- Contact / lead submission ---------- */
const contactForm = document.getElementById('contactForm');
const submitBtn = document.getElementById('submitBtn');
if (contactForm) {
    const fields = ['name', 'email', 'company', 'plan'];
    fields.forEach(field => {
        const input = contactForm.elements.namedItem(field);
        input.addEventListener('input', () => validateField(field));
        input.addEventListener('blur', () => validateField(field));
    });

    function validateField(field) {
        const input = contactForm.elements.namedItem(field);
        const group = input.closest('.form__group');
        const error = document.getElementById(`error-${field}`);
        let valid = true;
        if (!input.value.trim()) valid = false;
        else if (field === 'email') {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!re.test(input.value.trim())) valid = false;
        } else if (field === 'plan') {
            if (!input.value) valid = false;
        }
        if (valid) { group.classList.remove('error'); if (error) error.style.display = 'none'; }
        else { group.classList.add('error'); if (error) error.style.display = 'block'; }
        return valid;
    }

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!fields.every(validateField)) return;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';

        const data = Object.fromEntries(new FormData(contactForm));
        data.source = 'website';
        const storedUser = localStorage.getItem('lumen_user');
        if (storedUser) {
            try { data.user_id = JSON.parse(storedUser).id; } catch (e) {}
        }

        try {
            const res = await fetch(`${API}/leads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Submission failed');
            const lead = await res.json();
            showToast('Thanks — we\'ll be in touch soon.');
            contactForm.reset();
            fields.forEach(f => {
                const group = contactForm.elements.namedItem(f).closest('.form__group');
                group.classList.remove('error');
            });
        } catch (err) {
            showToast('Something went wrong. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send inquiry';
        }
    });
}

/* ---------- Feature cards (if present) ---------- */
document.querySelectorAll('.feature-card__btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const key = btn.closest('.feature-card').dataset.feature;
        showToast(`${key.charAt(0).toUpperCase() + key.slice(1)} coming soon.`);
    });
});
