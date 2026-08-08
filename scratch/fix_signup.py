import os

file_path = os.path.join(os.path.dirname(__file__), '../public/login.html')
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '<a href="/register.html" class="text-white hover:text-red-500 transition-colors">Sign Up</a>',
    '<a href="/register.html" class="text-red-500 hover:text-red-400 transition-colors font-black underline underline-offset-4">Sign up here</a>'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
