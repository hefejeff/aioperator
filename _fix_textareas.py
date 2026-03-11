import pathlib, re

f = pathlib.Path('src/components/CompanyResearchV2.tsx')
t = f.read_text()

def replace_textarea(m):
    inner = m.group(1)
    inner = re.sub(r'\s*rows=\{[^}]+\}', '', inner)
    return f'<AutoResizeTextarea{inner}/>'

pattern = re.compile(
    r'<textarea\b((?:(?!/>)[\s\S])*?(?:border-gray-200 bg-white|bg-white/10)(?:(?!/>)[\s\S])*?)/>',
    re.MULTILINE
)

new_t = pattern.sub(replace_textarea, t)
changed = t.count('<textarea') - new_t.count('<textarea')
f.write_text(new_t)
print(f'Replaced {changed} textarea(s) with AutoResizeTextarea')
