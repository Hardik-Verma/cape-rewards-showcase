import os
import re

public_dir = os.path.join(os.path.dirname(__file__), '../public')

html_files = [f for f in os.listdir(public_dir) if f.endswith('.html')]

for file in html_files:
    file_path = os.path.join(public_dir, file)
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Modals & Panels: p-8 -> p-6 sm:p-8
    content = re.sub(r'\bp-8\b(?=[^>]*class=[\'"][^\'"]*glass-panel[^\'"]*[\'"])', 'p-5 sm:p-8', content)
    # Generic p-8 fallback if it's inside a glass panel without matching above (we'll just replace safe instances)
    content = content.replace('glass-panel p-8', 'glass-panel p-5 sm:p-8')
    content = content.replace('p-8 relative', 'p-5 sm:p-8 relative')
    
    # 2. Hero Text scaling in index.html
    if file == 'index.html':
        content = content.replace('text-5xl md:text-7xl', 'text-4xl sm:text-5xl md:text-7xl')
        content = content.replace('text-4xl md:text-6xl', 'text-3xl sm:text-4xl md:text-6xl')
        content = content.replace('text-2xl md:text-3xl font-light', 'text-xl sm:text-2xl md:text-3xl font-light')
        # Fix horizontal scrolling grid
        content = content.replace('flex gap-6 overflow-visible', 'flex flex-col md:flex-row gap-6 overflow-visible w-full items-center md:items-start')
        
    # 3. Logo tracking
    content = content.replace('tracking-[0.2em]', 'tracking-widest sm:tracking-[0.2em]')
    
    # 4. Form inputs padding
    content = content.replace('p-4 rounded-xl', 'p-3 sm:p-4 rounded-xl')
    
    # 5. Navbar responsive links fix (so they fit on small screens)
    # Usually they are hidden on mobile, but if there's any visible flex-row, make it responsive
    content = content.replace('flex gap-2', 'flex flex-wrap gap-2')
    
    # 6. Tables in History/Admin
    if file in ['history.html', 'admin.html']:
        content = content.replace('<table class="w-full text-sm text-left">', '<div class="w-full overflow-x-auto"><table class="w-full text-sm text-left min-w-[600px]">')
        content = content.replace('</table>', '</table></div>')
        
    # 7. Make sure backgrounds don't overflow horizontally on 4K by restricting body to 100vw
    # Actually body is already overflow-x hidden.
    
    # 8. Modal containers width safe limit
    content = content.replace('max-w-md mx-4', 'max-w-md w-full sm:mx-4')

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Responsive replacements applied!")
