import os
import re

public_dir = os.path.join(os.path.dirname(__file__), '../public')
html_files = [f for f in os.listdir(public_dir) if f.endswith('.html')]

# The old bad JS block that uses style.display
bad_js_regex = re.compile(r"<script>\s*document\.addEventListener\('DOMContentLoaded',\s*\(\)\s*=>\s*\{\s*const\s*isAuth\s*=\s*!!localStorage\.getItem\('auth_token'\);\s*document\.querySelectorAll\('\.auth-hidden'\)\.forEach\(el\s*=>\s*\{\s*el\.style\.display\s*=\s*isAuth\s*\?\s*'none'\s*:\s*'block';\s*\}\);\s*document\.querySelectorAll\('\.auth-visible'\)\.forEach\(el\s*=>\s*\{\s*el\.style\.display\s*=\s*isAuth\s*\?\s*'block'\s*:\s*'none';\s*el\.classList\.remove\('hidden'\);\s*\}\);\s*\}\);\s*if\s*\(typeof\s*logout\s*===\s*'undefined'\)\s*\{\s*window\.logout\s*=\s*function\(\)\s*\{\s*localStorage\.removeItem\('auth_token'\);\s*window\.location\.href\s*=\s*'/login\.html';\s*\}\s*\}\s*</script>", re.MULTILINE | re.DOTALL)

good_js = """<script>
        document.addEventListener('DOMContentLoaded', () => {
            const isAuth = !!localStorage.getItem('auth_token');
            document.querySelectorAll('.auth-hidden').forEach(el => el.classList.toggle('hidden', isAuth));
            document.querySelectorAll('.auth-visible').forEach(el => el.classList.toggle('hidden', !isAuth));
        });
        if (typeof logout === 'undefined') {
            window.logout = function() {
                localStorage.removeItem('auth_token');
                window.location.href = '/login.html';
            }
        }
    </script>"""

for file in html_files:
    file_path = os.path.join(public_dir, file)
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace bad JS with good JS
    content = bad_js_regex.sub(good_js, content)
    
    # Also if it's login.html or register.html, replace the initGoogleAuth
    if file in ['login.html', 'register.html']:
        old_init_regex = re.compile(r"function\s+initGoogleAuth\(\)\s*\{\s*if\s*\(!window\.GOOGLE_CLIENT_ID\)\s*return;\s*const\s*init\s*=\s*\(\)\s*=>\s*\{.*?\}\s*\}", re.DOTALL)
        
        new_init = """async function initGoogleAuth() {
            try {
                const res = await fetch('/api/config');
                const data = await res.json();
                const clientId = data.googleClientId;
                if (!clientId) return;

                const init = () => {
                    google.accounts.id.initialize({
                        client_id: clientId,
                        callback: handleGoogleLogin
                    });
                    google.accounts.id.renderButton(
                        document.getElementById("google-btn-container"),
                        { theme: "filled_black", size: "large", text: "%s" }
                    );
                };

                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', init);
                } else {
                    init();
                }
            } catch (err) {
                console.error('Google Auth Init Error:', err);
            }
        }""" % ('signin_with' if file == 'login.html' else 'signup_with')

        content = old_init_regex.sub(new_init, content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("JS Fixed!")
