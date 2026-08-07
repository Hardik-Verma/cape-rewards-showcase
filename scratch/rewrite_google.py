import os
import re

public_dir = os.path.join(os.path.dirname(__file__), '../public')

for file in ['login.html', 'register.html']:
    file_path = os.path.join(public_dir, file)
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # The block to replace
    old_block_regex = re.compile(r'window\.initGoogleAuth = \(\) => \{.*?document\.head\.appendChild\(script\);', re.DOTALL)
    
    text_val = 'signin_with' if file == 'login.html' else 'signup_with'
    
    new_block = f"""
                const script = document.createElement('script');
                script.src = "https://accounts.google.com/gsi/client";
                script.async = true;
                script.defer = true;
                
                script.onload = () => {{
                    try {{
                        google.accounts.id.initialize({{
                            client_id: clientId.trim(),
                            callback: handleGoogleLogin
                        }});
                        google.accounts.id.renderButton(
                            document.getElementById("google-btn-container"),
                            {{ theme: "outline", size: "large", text: "{text_val}" }}
                        );
                    }} catch (e) {{
                        console.error('Google Render Error:', e);
                        document.getElementById('error-msg').innerText = "Google Auth Render Error: " + e.message;
                        document.getElementById('error-msg').classList.remove('hidden');
                    }}
                }};
                
                script.onerror = () => {{
                    document.getElementById('error-msg').innerText = "Failed to load Google Auth script. Check your Adblocker or connection.";
                    document.getElementById('error-msg').classList.remove('hidden');
                }};

                document.body.appendChild(script);"""
                
    content = old_block_regex.sub(new_block.strip(), content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Rewrote Google injection!")
