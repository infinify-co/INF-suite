from pathlib import Path
import re
pattern = re.compile(r'const dockItems.*?(?=\n\s*// )', flags=re.DOTALL)
files = [p for p in Path('suite').rglob('*.html') if 'copy' not in p.name.lower()]
count = 0
for path in files:
    text = path.read_text(encoding='utf-8')
    new_text = pattern.sub('', text)
    if new_text != text:
        path.write_text(new_text, encoding='utf-8')
        count += 1
print(f"Removed dock items blocks from {count} files")
