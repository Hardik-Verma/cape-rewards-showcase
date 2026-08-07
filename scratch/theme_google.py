import os
import re

public_dir = os.path.join(os.path.dirname(__file__), '../public')

for file in ['login.html', 'register.html']:
    file_path = os.path.join(public_dir, file)
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # The block to replace
    content = content.replace('theme: "outline", size: "large"', 'theme: "filled_black", size: "large", shape: "pill"')
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Updated Google button theme!")
