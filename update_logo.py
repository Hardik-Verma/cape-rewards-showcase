import glob

html_files = glob.glob('public/*.html')

old_logo_html = '''                <div class="flex-shrink-0 flex items-center">
                    <a href="/index.html" class="flex items-center gap-3 group">
                        <img src="/logo.png" alt="Logo" class="h-6 opacity-80 group-hover:opacity-100 transition-opacity duration-300 grayscale group-hover:grayscale-0">
                        <span class="text-white font-semibold text-sm tracking-[0.2em] uppercase">CAPEVERSE</span>
                    </a>
                </div>'''

new_logo_html = '''                <div class="flex-shrink-0 flex items-center">
                    <a href="/index.html" class="flex items-center gap-3">
                        <img src="/logo.png" alt="Logo" class="h-9">
                        <span class="text-white font-bold text-lg tracking-[0.2em] uppercase pt-0.5">CAPEVERSE</span>
                    </a>
                </div>'''

for file_path in html_files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    if old_logo_html in content:
        content = content.replace(old_logo_html, new_logo_html)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
            print(f"Updated navbar logo in {file_path}")

# Also update the footer logo grayscale
old_footer_logo = '<img src="/logo.png" alt="Logo" class="h-6 grayscale opacity-50">'
new_footer_logo = '<img src="/logo.png" alt="Logo" class="h-8 opacity-80">'

old_footer_text = '<span class="text-white font-bold text-sm tracking-[0.2em] uppercase">CAPEVERSE</span>'
new_footer_text = '<span class="text-white font-bold text-base tracking-[0.2em] uppercase pt-0.5">CAPEVERSE</span>'

for file_path in html_files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    updated = False
    if old_footer_logo in content:
        content = content.replace(old_footer_logo, new_footer_logo)
        updated = True
    if old_footer_text in content:
        content = content.replace(old_footer_text, new_footer_text)
        updated = True
        
    if updated:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
            print(f"Updated footer logo in {file_path}")
