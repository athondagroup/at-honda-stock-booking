#!/usr/bin/env python3
"""Build the AT Honda app.
  dist/index.html     the website (Supabase sign-in + adapter in web/gate.js)
  dist/artifact.html  the same app for the claude.ai artifact (uses the host's db / ai / files)
Needs the compiled Tailwind CSS at tools/app.css (tools/build.sh makes it)."""
import glob, json, os, re, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, WEB, DIST = os.path.join(ROOT, 'src'), os.path.join(ROOT, 'web'), os.path.join(ROOT, 'dist')
rd = lambda p: open(p, encoding='utf8').read()

head = rd(os.path.join(SRC, '00-head.html'))
layout = rd(os.path.join(SRC, '05-layout.html'))
js = ''.join(rd(f) + '\n' for f in sorted(glob.glob(os.path.join(SRC, '[1-9]*.js'))))
seed_json = lambda name: json.dumps(json.load(open(os.path.join(SRC, name), encoding='utf8')), ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
css = rd(os.path.join(ROOT, 'tools', 'app.css'))
cfg = json.load(open(os.path.join(WEB, 'config.json'), encoding='utf8'))
os.makedirs(DIST, exist_ok=True)

# claude.ai artifact: page content only (the host adds the document skeleton)
art_seed = 'seed-artifact.json' if os.path.exists(os.path.join(SRC, 'seed-artifact.json')) else 'seed-web.json'
art = head + layout + '\n<script id="seed" type="application/json">' + seed_json(art_seed) + '</script>\n<script>\n(() => {\n\'use strict\';\n' + js + '})();\n</script>\n'
open(os.path.join(DIST, 'artifact.html'), 'w', encoding='utf8').write(art)

# website
h = re.sub(r'<script src="https://cdn.tailwindcss.com[^"]*"></script>', '', head)
h = re.sub(r'<script>\s*if \(window.tailwind\)[\s\S]*?</script>', '', h, count=1)
gate_css = rd(os.path.join(WEB, 'gate.css'))
import hashlib
BUILD = hashlib.sha1((js + css + rd(os.path.join(WEB, 'gate.js'))).encode('utf8')).hexdigest()[:10]
page = f'''<!doctype html>
<html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#17181c"><link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="AT Honda">
{h}
<style>{css}</style><style>{gate_css}</style></head><body>
<div id="gate" hidden></div>
{layout}
<script id="seed" type="application/json">{seed_json('seed-web.json')}</script>
<script>window.AT_CONFIG = {json.dumps(cfg)}; window.__BUILD = '{BUILD}';</script>
<script>window.__startApp = function () {{ (() => {{
'use strict';
{js}}})(); }};</script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/dist/umd/supabase.min.js"></script>
<script src="gate.js"></script>
</body></html>
'''
open(os.path.join(DIST, 'index.html'), 'w', encoding='utf8').write(page)
for f in ['gate.js', 'sw.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png']:
    shutil.copy(os.path.join(WEB, f), os.path.join(DIST, f))
open(os.path.join(DIST, '.nojekyll'), 'w').write('')
open(os.path.join(DIST, 'version.json'), 'w').write(json.dumps({'v': BUILD}))
open(os.path.join(DIST, 'check.js'), 'w', encoding='utf8').write("(() => {\n'use strict';\n" + js + '})();\n')
r = subprocess.run(['node', '--check', os.path.join(DIST, 'check.js')], capture_output=True, text=True)
os.remove(os.path.join(DIST, 'check.js'))
if r.returncode: print(r.stderr); sys.exit(1)
print('BUILD_OK', len(page), 'bytes')
