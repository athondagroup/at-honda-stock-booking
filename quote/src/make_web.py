# builds the website version of the quote page: quote/index.html for the AT Honda GitHub Pages site
# (same Supabase login as the AT stock web; quote/gate.js answers window.claude.use(...) from Supabase)
import os, re, sys, json
src, js_path, out = sys.argv[1], sys.argv[2], sys.argv[3]
here = os.path.dirname(os.path.abspath(__file__))
h = open(src, encoding='utf-8').read()
js = open(js_path, encoding='utf-8').read()
ma = open(os.path.join(here, 'make_artifact.py'), encoding='utf-8').read()
shim = ma[ma.index('shim = r"""') + len('shim = r"""'):ma.index('"""', ma.index('shim = r"""') + 12)]
# website: ordinary browser downloads, so drop the anchor-click override (keep the in-page messages)
a = shim.index('  var dlPromise = null;'); b = shim.index('})();\n</script>')
shim = shim[:a] + shim[b:]
top = ma[ma.index('top = """') + len('top = """'):ma.index('"""', ma.index('top = """') + 10)]
head = h[h.index('<style>'):h.index('</head>')]
head = head.replace('<style>', '<style>\n@layer components {', 1).replace('</style>', '}\n</style>', 1)
body = h[h.index('<body>') + len('<body>'):h.index('</body>')]
body = re.sub(r'<script type="text/babel">[\s\S]*?</script>', '', body)
tw_css = open(os.path.join(here, 'tw.css'), encoding='utf-8').read()
cfg = {"url": "https://gvdqxuupaqqorbszgliq.supabase.co", "key": "sb_publishable_K90tJ6lgj_agJijl-IJ87w_r1_b9z6-"}
gate_css = open(os.path.join(here, 'web', 'gate.css'), encoding='utf-8').read()
page = ('<!doctype html>\n<html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        '<meta name="theme-color" content="#dc2626"><link rel="icon" href="../icon-192.png"><link rel="apple-touch-icon" href="../icon-192.png">\n'
        + top + '<style>\n' + tw_css + '\n</style>\n<style>' + gate_css + '</style>\n' + shim + '\n' + head + '</head><body>\n<div id="gate" hidden></div>\n' + body
        + '\n<script>window.AT_CONFIG = ' + json.dumps(cfg) + ';</script>\n'
        + '<script>window.__startApp = function () {\n' + js + '\n};</script>\n'
        + '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/dist/umd/supabase.min.js"></script>\n'
        + '<script src="gate.js"></script>\n</body></html>\n')
open(out, 'w', encoding='utf-8').write(page)
print('web page', len(page))
