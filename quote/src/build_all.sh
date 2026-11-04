set -e
cd /tmp/claude-0/-home-claude/1a292131-38c5-5eed-a642-90eedf2796f9/scratchpad
python3 v4/patch.py src.html v4.html
python3 - v4.html > app4.jsx <<'PY'
import re,sys
h=open(sys.argv[1],encoding='utf-8').read()
print(re.search(r'<script type="text/babel">([\s\S]*?)</script>',h).group(1))
PY
/root/.bun/bin/bun build ./app4.jsx --no-bundle --jsx-runtime=classic --outfile app4.js 2>&1 | grep -i error || true
node tw_build.mjs app4.js tw.css && python3 tw_post.py tw.css tw.css
python3 build_test.py v4.html app4.js test_owner.html owner athonda.group@gmail.com
python3 build_test.py v4.html app4.js test_sales.html sales sales1@gmail.com
