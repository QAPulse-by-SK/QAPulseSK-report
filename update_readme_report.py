import sys

with open('/Users/shahnawazkhan/QAPulseSK-report/README.md', 'r') as f:
    content = f.read()

old = '> **The only test reporter you\'ll ever need.**\n> Playwright · Cypress · Jest · Vitest — one package, zero config, beautiful results.\n\n---'
new = '> **The only test reporter you\'ll ever need.**\n> Playwright · Cypress · Jest · Vitest — one package, zero config, beautiful results.\n\n![qapulsesk-report demo](https://raw.githubusercontent.com/QAPulse-by-SK/QAPulseSK-report/main/assets/qapulse-report-final.gif)\n\n---'

if old in content:
    content = content.replace(old, new, 1)
    with open('/Users/shahnawazkhan/QAPulseSK-report/README.md', 'w') as f:
        f.write(content)
    print('✅ report README updated with GIF')
else:
    print('❌ Pattern not found')
