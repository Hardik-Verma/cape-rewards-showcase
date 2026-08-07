import os
import re

public_dir = os.path.join(os.path.dirname(__file__), '../public')
html_files = [f for f in os.listdir(public_dir) if f.endswith('.html')]

desktop_nav_template = """                <!-- Desktop Nav -->
                <div class="hidden md:flex items-center">
                    <div class="ml-10 flex items-center space-x-8">
                        <a href="/index.html" class="relative group text-gray-500 hover:text-white px-2 py-2 text-xs font-semibold transition-colors tracking-widest uppercase NAV_HOME_CLASS">
                            Home
                            <span class="absolute left-0 bottom-0 w-0 h-[1px] bg-red-600 transition-all duration-300 ease-out group-hover:w-full NAV_HOME_UNDERLINE"></span>
                        </a>
                        <a href="/about.html" class="relative group text-gray-500 hover:text-white px-2 py-2 text-xs font-semibold transition-colors tracking-widest uppercase NAV_ABOUT_CLASS">
                            About
                            <span class="absolute left-0 bottom-0 w-0 h-[1px] bg-red-600 transition-all duration-300 ease-out group-hover:w-full NAV_ABOUT_UNDERLINE"></span>
                        </a>
                        <a href="/claim.html" class="auth-visible hidden relative group text-gray-500 hover:text-white px-2 py-2 text-xs font-semibold transition-colors tracking-widest uppercase NAV_CLAIM_CLASS">
                            Claim
                            <span class="absolute left-0 bottom-0 w-0 h-[1px] bg-red-600 transition-all duration-300 ease-out group-hover:w-full NAV_CLAIM_UNDERLINE"></span>
                        </a>
                        <a href="/history.html" class="auth-visible hidden relative group text-gray-500 hover:text-white px-2 py-2 text-xs font-semibold transition-colors tracking-widest uppercase NAV_HISTORY_CLASS">
                            History
                            <span class="absolute left-0 bottom-0 w-0 h-[1px] bg-red-600 transition-all duration-300 ease-out group-hover:w-full NAV_HISTORY_UNDERLINE"></span>
                        </a>
                        <a href="/support.html" class="relative group text-gray-500 hover:text-white px-2 py-2 text-xs font-semibold transition-colors tracking-widest uppercase NAV_SUPPORT_CLASS">
                            Support
                            <span class="absolute left-0 bottom-0 w-0 h-[1px] bg-red-600 transition-all duration-300 ease-out group-hover:w-full NAV_SUPPORT_UNDERLINE"></span>
                        </a>
                        
                        <!-- Auth buttons -->
                        <a href="/login.html" class="auth-hidden relative group text-emerald-500 hover:text-emerald-400 px-2 py-2 text-xs font-semibold transition-colors tracking-widest uppercase NAV_LOGIN_CLASS">
                            Login
                            <span class="absolute left-0 bottom-0 w-0 h-[1px] bg-emerald-600 transition-all duration-300 ease-out group-hover:w-full"></span>
                        </a>
                        <button onclick="logout()" class="auth-visible hidden relative group text-red-500 hover:text-red-400 px-2 py-2 text-xs font-semibold transition-colors tracking-widest uppercase">
                            Logout
                            <span class="absolute left-0 bottom-0 w-0 h-[1px] bg-red-600 transition-all duration-300 ease-out group-hover:w-full"></span>
                        </button>

                        <a href="https://discord.gg/tgCFxYD948" target="_blank" class="text-gray-500 hover:text-[#5865F2] transition-colors flex items-center" title="Join our Discord">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                        </a>
                    </div>
                </div>"""

mobile_nav_template = """        <!-- Mobile Menu Dropdown -->
        <div id="mobile-menu" class="md:hidden hidden bg-[#050505] border-b border-white/5 absolute w-full left-0 top-20 shadow-2xl z-50">
            <div class="px-4 pt-2 pb-6 space-y-1">
                <a href="/index.html" class="block px-4 py-3 text-xs font-semibold text-gray-400 tracking-widest uppercase hover:text-white hover:bg-white/5 rounded-md transition-colors">Home</a>
                <a href="/about.html" class="block px-4 py-3 text-xs font-semibold text-gray-400 tracking-widest uppercase hover:text-white hover:bg-white/5 rounded-md transition-colors">About</a>
                <a href="/claim.html" class="auth-visible hidden block px-4 py-3 text-xs font-semibold text-gray-400 tracking-widest uppercase hover:text-white hover:bg-white/5 rounded-md transition-colors">Claim</a>
                <a href="/history.html" class="auth-visible hidden block px-4 py-3 text-xs font-semibold text-gray-400 tracking-widest uppercase hover:text-white hover:bg-white/5 rounded-md transition-colors">History</a>
                <a href="/support.html" class="block px-4 py-3 text-xs font-semibold text-gray-400 tracking-widest uppercase hover:text-white hover:bg-white/5 rounded-md transition-colors">Support</a>
                <a href="/login.html" class="auth-hidden block px-4 py-3 text-xs font-semibold text-emerald-500 tracking-widest uppercase hover:text-emerald-400 hover:bg-white/5 rounded-md transition-colors">Login</a>
                <button onclick="logout()" class="auth-visible hidden block w-full text-left px-4 py-3 text-xs font-semibold text-red-500 tracking-widest uppercase hover:text-red-400 hover:bg-white/5 rounded-md transition-colors">Logout</button>
                <a href="https://discord.gg/tgCFxYD948" target="_blank" class="block px-4 py-3 text-xs font-semibold text-[#5865F2] tracking-widest uppercase hover:bg-white/5 rounded-md transition-colors flex items-center w-fit gap-3">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg> Join Discord
                </a>
            </div>
        </div>"""

js_script = """
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const isAuth = !!localStorage.getItem('auth_token');
            document.querySelectorAll('.auth-hidden').forEach(el => { el.style.display = isAuth ? 'none' : 'block'; });
            document.querySelectorAll('.auth-visible').forEach(el => { el.style.display = isAuth ? 'block' : 'none'; el.classList.remove('hidden'); });
        });
        if (typeof logout === 'undefined') {
            window.logout = function() {
                localStorage.removeItem('auth_token');
                window.location.href = '/login.html';
            }
        }
    </script>
"""

desktop_regex = re.compile(r'<!-- Desktop Nav -->.*?</div>\s*</div>', re.DOTALL)
mobile_regex = re.compile(r'<!-- Mobile Menu Dropdown -->.*?</div>\s*</div>', re.DOTALL)

for file in html_files:
    if file == 'preview.html': continue

    page_type = file.replace('.html', '').upper()
    if page_type == 'INDEX': page_type = 'HOME'
    
    with open(os.path.join(public_dir, file), 'r', encoding='utf-8') as f:
        content = f.read()

    # Build desktop nav
    custom_desktop = desktop_nav_template
    custom_desktop = custom_desktop.replace(f'NAV_{page_type}_CLASS', '!text-white')
    custom_desktop = custom_desktop.replace(f'NAV_{page_type}_UNDERLINE', '!w-full')
    custom_desktop = re.sub(r'NAV_[A-Z]+_CLASS', '', custom_desktop)
    custom_desktop = re.sub(r'NAV_[A-Z]+_UNDERLINE', '', custom_desktop)
    
    # Replace desktop nav
    content = desktop_regex.sub(custom_desktop, content)
    
    # Replace mobile nav
    content = mobile_regex.sub(mobile_nav_template, content)
    
    # Add JS script
    if 'auth-hidden' not in content:
        # Avoid duplicate scripts
        if '<script>\n        document.addEventListener(\'DOMContentLoaded\', () => {\n            const isAuth = !!localStorage.getItem(\'auth_token\');' not in content:
            content = content.replace('</body>', js_script + '\n</body>')
            
    with open(os.path.join(public_dir, file), 'w', encoding='utf-8') as f:
        f.write(content)

print("Navbars synced successfully!")
