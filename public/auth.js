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
}

if (typeof window.logout === 'undefined') {
    window.logout = function() {
        localStorage.removeItem('auth_token');
        window.location.href = '/login.html';
    }
}
