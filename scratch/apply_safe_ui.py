import os
import re

public_dir = os.path.join(os.path.dirname(__file__), '../public')
html_files = [f for f in os.listdir(public_dir) if f.endswith('.html')]

for file in html_files:
    file_path = os.path.join(public_dir, file)
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update text across pages
    content = content.replace("Giveaway Verification", "Earn Rewards")
    content = content.replace("receive an exclusive giveaway role", "earn your exclusive capes")
    content = content.replace("receive your exclusive giveaway role", "earn your exclusive capes")
    content = content.replace('exclusive drops', 'exclusive rewards')
    content = content.replace('giveaway role', 'reward access')

    # 2. Add 'Orders' tab and make Claim and Orders globally visible
    # Claim:
    content = content.replace(
        '<a href="/claim.html" class="auth-visible hidden relative group text-gray-500',
        '<a href="/claim.html" class="relative group text-gray-500'
    )
    content = content.replace(
        '<a href="/claim.html" class="auth-visible hidden block px-4 py-3',
        '<a href="/claim.html" class="block px-4 py-3'
    )

    # Orders (was History):
    # Desktop nav
    content = re.sub(
        r'<a href="/history\.html" class="auth-visible hidden relative group([^"]*)">\s*History\s*<span',
        r'<a href="/history.html" class="relative group\1">\n                            Orders\n                            <span',
        content
    )
    # Mobile nav
    content = re.sub(
        r'<a href="/history\.html" class="auth-visible hidden block px-4 py-3([^"]*)">History</a>',
        r'<a href="/history.html" class="block px-4 py-3\1">Orders</a>',
        content
    )
    
    # 3. index.html specific tweaks
    if file == 'index.html':
        content = re.sub(r'<div class="text-xs uppercase tracking-\[0\.4em\] text-gray-400 mb-8">Scroll To Unlock</div>', '', content)
        content = content.replace('Preview Rewards\n                    </a>', 'EARN REWARDS\n                    </a>')
        content = content.replace('px-8 py-3 bg-white', 'px-12 py-4 bg-white')
        content = content.replace('px-8 py-3 bg-white/5', 'px-4 py-2 bg-white/5')
        content = content.replace('text-xs font-bold uppercase tracking-widest text-white hover:bg-white/10 hover:border-red-500 transition-all pointer-events-auto', 'text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 hover:border-red-500 transition-all pointer-events-auto')
        
        # Remove the conflicting hardcoded index.html auth logic inside its existing script
        # The block starts at `// Dynamic Auth UI` and ends just before `});`
        auth_ui_block = re.search(r'// Dynamic Auth UI.*?}\s*}\s*', content, re.DOTALL)
        if auth_ui_block:
            content = content.replace(auth_ui_block.group(0), '')

    # 4. login.html specific tweaks
    if file == 'login.html':
        content = content.replace(
            '<a href="/register.html" class="text-white hover:text-red-500 transition-colors font-bold">Sign up</a>',
            '<a href="/register.html" class="text-red-500 hover:text-red-400 transition-colors font-black underline underline-offset-4">Sign up here</a>'
        )
        content = content.replace("Don't have an account?", "Want to earn a cape?")
        
        # Remove its internal auth script entirely to prevent conflicts with the new auth.js
        old_auth = re.search(r'<script>\s*document\.addEventListener\(\'DOMContentLoaded\', \(\) => \{\s*const isAuth.*?\}\s*</script>', content, re.DOTALL)
        if old_auth:
            content = content.replace(old_auth.group(0), '')

    # 5. history.html specific tweak
    if file == 'history.html':
        # Remove its internal auth script block that defines logout() to prevent redeclaration
        old_logout = re.search(r'function logout\(\) \{\s*localStorage\.removeItem\(\'auth_token\'\);\s*window\.location\.href = \'/login\.html\';\s*\}', content, re.DOTALL)
        if old_logout:
            content = content.replace(old_logout.group(0), '')

    # 6. Inject the unified auth.js at the bottom of the body
    if '</body>' in content and '<script src="/auth.js"></script>' not in content:
        content = content.replace('</body>', '    <script src="/auth.js"></script>\n</body>')

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Applied UI tweaks safely!")
