import glob
import re

html_files = glob.glob('public/*.html')

for file_path in html_files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update old discord link to new one
    content = content.replace('https://discord.com/channels/1511260578902052996/1519908293202677921', 'https://discord.gg/GJPV4Jf6yb')

    # 2. Fix the Discord logo alignment in navbar
    content = content.replace('flex items-center h-full pt-1"', 'flex items-center"')

    # 3. Change hidden md:block to hidden md:flex items-center, and items-baseline to items-center
    content = content.replace('<div class="hidden md:block">', '''<!-- Mobile Menu Button -->
                <div class="md:hidden flex items-center">
                    <button id="mobile-menu-btn" class="text-gray-400 hover:text-white focus:outline-none p-2 transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
                    </button>
                </div>
                <!-- Desktop Nav -->
                <div class="hidden md:flex items-center">''')
    content = content.replace('<div class="ml-10 flex items-baseline space-x-8">', '<div class="ml-10 flex items-center space-x-8">')

    # 4. Add mobile menu dropdown right before </nav>
    mobile_menu = '''
        <!-- Mobile Menu Dropdown -->
        <div id="mobile-menu" class="md:hidden hidden bg-[#050505] border-b border-white/5 absolute w-full left-0 top-20 shadow-2xl">
            <div class="px-4 pt-2 pb-6 space-y-1">
                <a href="/index.html" class="block px-4 py-3 text-xs font-semibold text-gray-400 tracking-widest uppercase hover:text-white hover:bg-white/5 rounded-md transition-colors">Home</a>
                <a href="/about.html" class="block px-4 py-3 text-xs font-semibold text-gray-400 tracking-widest uppercase hover:text-white hover:bg-white/5 rounded-md transition-colors">About</a>
                <a href="/claim.html" class="block px-4 py-3 text-xs font-semibold text-gray-400 tracking-widest uppercase hover:text-white hover:bg-white/5 rounded-md transition-colors">Claim</a>
                <a href="/support.html" class="block px-4 py-3 text-xs font-semibold text-gray-400 tracking-widest uppercase hover:text-white hover:bg-white/5 rounded-md transition-colors">Support</a>
                <a href="https://discord.gg/GJPV4Jf6yb" target="_blank" class="block px-4 py-3 text-xs font-semibold text-[#5865F2] tracking-widest uppercase hover:bg-white/5 rounded-md transition-colors flex items-center gap-3">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg> Join Discord
                </a>
            </div>
        </div>
    </nav>'''
    if 'id="mobile-menu"' not in content:
        content = content.replace('    </nav>', mobile_menu)

    # 5. Add mobile menu toggle script
    toggle_script = '''
        document.addEventListener('DOMContentLoaded', () => {
            const mobileBtn = document.getElementById('mobile-menu-btn');
            const mobileMenu = document.getElementById('mobile-menu');
            if (mobileBtn && mobileMenu) {
                mobileBtn.addEventListener('click', () => {
                    mobileMenu.classList.toggle('hidden');
                });
            }
        });
'''
    if 'mobileBtn.addEventListener' not in content:
        content = content.replace('</script>\n</body>', toggle_script + '    </script>\n</body>')

    # 6. Add Discord icon to footer under Capeverse
    footer_discord = '''                    <div class="flex items-center gap-4 mb-6">
                        <a href="https://discord.gg/GJPV4Jf6yb" target="_blank" class="text-gray-500 hover:text-[#5865F2] transition-colors" title="Join our Discord">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                        </a>
                    </div>
                    <div class="text-gray-700 text-[10px] uppercase tracking-widest">'''
    if 'mb-6">\n                        <a href="https://discord.gg/' not in content:
        content = content.replace('                    <div class="text-gray-700 text-[10px] uppercase tracking-widest">', footer_discord)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
        print(f"Updated {file_path}")
