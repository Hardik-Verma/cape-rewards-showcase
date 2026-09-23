// Instant auth state check and navbar toggling
const token = localStorage.getItem('auth_token');
const authVisible = document.querySelectorAll('.auth-visible');
const authHidden = document.querySelectorAll('.auth-hidden');

if (token) {
    authHidden.forEach(el => el.classList.add('hidden'));
    authVisible.forEach(el => el.classList.remove('hidden'));
    
    // Update links
    document.querySelectorAll('a[href="/preview.html"]').forEach(el => {
        el.href = '/claim.html';
        if (el.innerText.includes('Preview Rewards')) {
            el.innerText = 'Go to Dashboard';
        } else if (el.innerText.includes('Preview')) {
            el.innerText = 'Dashboard';
        }
    });
} else {
    authHidden.forEach(el => el.classList.remove('hidden'));
    authVisible.forEach(el => el.classList.add('hidden'));

    // Guests see the taster/preview layout everywhere instead of bouncing to login.
    // Logged-in users (above) are routed to the real claim dashboard.
    document.querySelectorAll('a[href="/claim.html"]').forEach(el => {
        el.href = '/preview.html';
        if (el.innerText.toLowerCase().includes('claim')) {
            el.innerText = 'Preview';
        }
    });
}

if (typeof window.logout === 'undefined') {
    window.logout = function() {
        localStorage.removeItem('auth_token');
        window.location.href = '/login.html';
    }
}

// Replace every Discord invite link on the page with the admin-configured invite link
// (fetched from /api/config, editable via the Admin Panel without touching code)
fetch('/api/config')
    .then(r => r.json())
    .then(cfg => {
        if (cfg.discordInviteLink) {
            document.querySelectorAll('a[href*="discord.gg"]').forEach(a => {
                a.href = cfg.discordInviteLink;
            });
        }
    })
    .catch(() => {});
