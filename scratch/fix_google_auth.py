import os
import re

public_dir = os.path.join(os.path.dirname(__file__), '../public')

for file in ['login.html', 'register.html']:
    file_path = os.path.join(public_dir, file)
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Remove the old script tag from head
    content = re.sub(r'<script src="https://accounts\.google\.com/gsi/client\?onload=initGoogleAuth" async defer></script>\s*', '', content)
    
    # 2. Replace the old initGoogleAuth block
    old_block_regex = re.compile(r'async function initGoogleAuth\(\)\s*\{.*?\}(?=\s*async function handleGoogleLogin)', re.DOTALL)
    
    text_val = 'signin_with' if file == 'login.html' else 'signup_with'
    
    new_block = f"""async function loadGoogleAuth() {{
            try {{
                const res = await fetch('/api/config');
                const data = await res.json();
                const clientId = data.googleClientId;
                if (!clientId) return;

                window.initGoogleAuth = () => {{
                    google.accounts.id.initialize({{
                        client_id: clientId,
                        callback: handleGoogleLogin
                    }});
                    google.accounts.id.renderButton(
                        document.getElementById("google-btn-container"),
                        {{ theme: "filled_black", size: "large", text: "{text_val}" }}
                    );
                }};

                const script = document.createElement('script');
                script.src = "https://accounts.google.com/gsi/client?onload=initGoogleAuth";
                script.async = true;
                script.defer = true;
                document.head.appendChild(script);
            }} catch (err) {{
                console.error('Google Auth Init Error:', err);
            }}
        }}

        if (document.readyState === 'loading') {{
            document.addEventListener('DOMContentLoaded', loadGoogleAuth);
        }} else {{
            loadGoogleAuth();
        }}
"""
    
    content = old_block_regex.sub(new_block, content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Fixed Google Auth injection!")
