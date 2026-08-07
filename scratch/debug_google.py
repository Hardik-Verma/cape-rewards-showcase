import os
import re

public_dir = os.path.join(os.path.dirname(__file__), '../public')

for file in ['login.html', 'register.html']:
    file_path = os.path.join(public_dir, file)
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    new_block = """const clientId = data.googleClientId;
                if (!clientId) {
                    document.getElementById('error-msg').innerText = "Developer Error: GOOGLE_CLIENT_ID is missing from backend environment variables.";
                    document.getElementById('error-msg').classList.remove('hidden');
                    return;
                }"""
                
    content = content.replace("const clientId = data.googleClientId;\n                if (!clientId) return;", new_block)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Added on-screen debug logic!")
