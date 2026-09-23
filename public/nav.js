// Full nav injection — replaces <div id="nav-root"> with the complete navbar.
// Every page just needs: <div id="nav-root"></div>
(function() {
    var root = document.getElementById('nav-root');
    if (!root) return;

    var path = window.location.pathname;

    root.innerHTML =
    '<nav class="nav-glass fixed w-full top-0 z-50">' +
        '<div class="max-w-7xl mx-auto px-6 lg:px-8">' +
            '<div class="flex items-center justify-between h-20">' +
                '<div class="flex-shrink-0 flex items-center">' +
                    '<a href="/index.html" class="flex items-center gap-3">' +
                        '<img src="/logo.png" alt="Logo" class="h-9">' +
                        '<span class="text-white font-bold text-lg tracking-widest sm:tracking-[0.2em] uppercase pt-0.5">CAPEVERSE</span>' +
                    '</a>' +
                '</div>' +

                // Desktop nav (hidden on mobile)
                '<div class="hidden md:flex items-center">' +
                    '<a href="/index.html" class="relative group text-gray-500 hover:text-white px-2 py-2 text-xs font-semibold transition-colors tracking-widest uppercase' + (path === '/index.html' || path === '/' ? ' !text-white' : '') + '">' +
                        '<span class="relative z-10">Home</span>' +
                        '<span class="absolute inset-x-0 bottom-0 h-0.5 bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform' + (path === '/index.html' || path === '/' ? ' scale-x-100' : '') + '"></span>' +
                    '</a>' +
                    '<a href="/about.html" class="relative group text-gray-500 hover:text-white px-2 py-2 text-xs font-semibold transition-colors tracking-widest uppercase' + (path === '/about.html' ? ' !text-white' : '') + '">' +
                        '<span class="relative z-10">About</span>' +
                        '<span class="absolute inset-x-0 bottom-0 h-0.5 bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform' + (path === '/about.html' ? ' scale-x-100' : '') + '"></span>' +
                    '</a>' +
                    '<a href="/preview.html" class="auth-hidden relative group text-gray-500 hover:text-white px-2 py-2 text-xs font-semibold transition-colors tracking-widest uppercase' + (path === '/preview.html' ? ' !text-white' : '') + '">' +
                        '<span class="relative z-10">Preview</span>' +
                        '<span class="absolute inset-x-0 bottom-0 h-0.5 bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform' + (path === '/preview.html' ? ' scale-x-100' : '') + '"></span>' +
                    '</a>' +
                    '<a href="/claim.html" class="auth-visible hidden relative group text-gray-500 hover:text-white px-2 py-2 text-xs font-semibold transition-colors tracking-widest uppercase' + (path === '/claim.html' ? ' !text-white' : '') + '">' +
                        '<span class="relative z-10">Claim</span>' +
                        '<span class="absolute inset-x-0 bottom-0 h-0.5 bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform' + (path === '/claim.html' ? ' scale-x-100' : '') + '"></span>' +
                    '</a>' +
                    '<a href="/history.html" class="auth-visible hidden relative group text-gray-500 hover:text-white px-2 py-2 text-xs font-semibold transition-colors tracking-widest uppercase' + (path === '/history.html' ? ' !text-white' : '') + '">' +
                        '<span class="relative z-10">Orders</span>' +
                        '<span class="absolute inset-x-0 bottom-0 h-0.5 bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform' + (path === '/history.html' ? ' scale-x-100' : '') + '"></span>' +
                    '</a>' +
                    '<a href="/support.html" class="relative group text-gray-500 hover:text-white px-2 py-2 text-xs font-semibold transition-colors tracking-widest uppercase' + (path === '/support.html' ? ' !text-white' : '') + '">' +
                        '<span class="relative z-10">Support</span>' +
                        '<span class="absolute inset-x-0 bottom-0 h-0.5 bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform' + (path === '/support.html' ? ' scale-x-100' : '') + '"></span>' +
                    '</a>' +
                    '<a href="#" id="nav-discord" target="_blank" class="relative group text-gray-500 hover:text-[#5865F2] px-2 py-2 text-xs font-semibold transition-colors tracking-widest uppercase">' +
                        '<span class="relative z-10">Discord</span>' +
                    '</a>' +
                    '<a href="/login.html" class="auth-hidden relative group text-emerald-500 hover:text-emerald-400 px-2 py-2 text-xs font-semibold transition-colors tracking-widest uppercase">' +
                        '<span class="relative z-10">Login</span>' +
                    '</a>' +
                    '<button onclick="logout()" class="auth-visible hidden relative group text-red-500 hover:text-red-400 px-2 py-2 text-xs font-semibold transition-colors tracking-widest uppercase">Logout</button>' +
                '</div>' +

                // Mobile menu button
                '<button id="mobile-menu-btn" class="md:hidden text-gray-400 hover:text-white focus:outline-none p-2 transition-colors">' +
                    '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>' +
                '</button>' +
            '</div>' +
        '</div>' +

        // Mobile menu dropdown
        '<div id="mobile-menu" class="md:hidden hidden bg-[#050505] border-b border-white/5 absolute w-full left-0 top-20 shadow-2xl z-50">' +
            '<div class="px-6 py-6 space-y-1">' +
                '<a href="/index.html" class="block px-4 py-3 text-xs font-semibold text-gray-400 tracking-widest uppercase hover:text-white hover:bg-white/5 rounded-md transition-colors">Home</a>' +
                '<a href="/about.html" class="block px-4 py-3 text-xs font-semibold text-gray-400 tracking-widest uppercase hover:text-white hover:bg-white/5 rounded-md transition-colors">About</a>' +
                '<a href="/preview.html" class="auth-hidden block px-4 py-3 text-xs font-semibold text-gray-400 tracking-widest uppercase hover:text-white hover:bg-white/5 rounded-md transition-colors">Preview</a>' +
                '<a href="/claim.html" class="auth-visible hidden block px-4 py-3 text-xs font-semibold text-gray-400 tracking-widest uppercase hover:text-white hover:bg-white/5 rounded-md transition-colors">Claim</a>' +
                '<a href="/history.html" class="auth-visible hidden block px-4 py-3 text-xs font-semibold text-gray-400 tracking-widest uppercase hover:text-white hover:bg-white/5 rounded-md transition-colors">Orders</a>' +
                '<a href="/support.html" class="block px-4 py-3 text-xs font-semibold text-gray-400 tracking-widest uppercase hover:text-white hover:bg-white/5 rounded-md transition-colors">Support</a>' +
                '<a href="#" id="nav-discord-mobile" target="_blank" class="block px-4 py-3 text-xs font-semibold text-gray-400 tracking-widest uppercase hover:text-[#5865F2] hover:bg-white/5 rounded-md transition-colors">Discord</a>' +
                '<a href="/login.html" class="auth-hidden block px-4 py-3 text-xs font-semibold text-emerald-500 tracking-widest uppercase hover:text-emerald-400 hover:bg-white/5 rounded-md transition-colors">Login</a>' +
                '<button onclick="logout()" class="auth-visible hidden block w-full text-left px-4 py-3 text-xs font-semibold text-red-500 tracking-widest uppercase hover:text-red-400 hover:bg-white/5 rounded-md transition-colors">Logout</button>' +
            '</div>' +
        '</div>' +
    '</nav>';

    // Mobile menu toggle
    var btn = document.getElementById('mobile-menu-btn');
    var menu = document.getElementById('mobile-menu');
    if (btn && menu) {
        btn.addEventListener('click', function() { menu.classList.toggle('hidden'); });
    }

    // Wire Discord link from /api/config
    function setDiscord(el, cfg) {
        if (el) el.href = cfg && cfg.discordInviteLink ? cfg.discordInviteLink : 'https://discord.gg/tgCFxYD948';
    }
    fetch('/api/config').then(function(r){ return r.json(); }).then(function(cfg){
        setDiscord(document.getElementById('nav-discord'), cfg);
        setDiscord(document.getElementById('nav-discord-mobile'), cfg);
    }).catch(function() {
        setDiscord(document.getElementById('nav-discord'), {});
        setDiscord(document.getElementById('nav-discord-mobile'), {});
    });
})();