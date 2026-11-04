import os, re, sys
src, js_path, out = sys.argv[1], sys.argv[2], sys.argv[3]
here = os.path.dirname(os.path.abspath(__file__))
h = open(src, encoding='utf-8').read()
js = open(js_path, encoding='utf-8').read()

head = h[h.index('<style>'):h.index('</head>')]
body = h[h.index('<body>') + len('<body>'):h.index('</body>')]
body = re.sub(r'<script type="text/babel">[\s\S]*?</script>', lambda m: '<script>\n' + js + '\n</script>', body)

shim = r"""<script>
/* ARTIFACT-SHIM: storage guard, in-page messages instead of alert(), file saves through the downloads capability */
(function () {
  try { var k = '__at_t'; window.localStorage.setItem(k, k); window.localStorage.removeItem(k); }
  catch (e) {
    var mem = {};
    var store = {
      getItem: function (key) { return Object.prototype.hasOwnProperty.call(mem, key) ? mem[key] : null; },
      setItem: function (key, v) { mem[key] = String(v); },
      removeItem: function (key) { delete mem[key]; },
      clear: function () { mem = {}; },
      key: function (i) { return Object.keys(mem)[i] || null; },
      get length() { return Object.keys(mem).length; }
    };
    try { Object.defineProperty(window, 'localStorage', { value: store, configurable: true }); } catch (e2) {}
  }
  function toast(msg) {
    var box = document.getElementById('at-toast-stack');
    if (!box) {
      box = document.createElement('div');
      box.id = 'at-toast-stack';
      box.setAttribute('role', 'status');
      box.setAttribute('aria-live', 'polite');
      document.body.appendChild(box);
    }
    var item = document.createElement('div');
    item.className = 'at-toast';
    item.textContent = String(msg == null ? '' : msg);
    var close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'ปิด';
    close.onclick = function () { item.remove(); };
    item.appendChild(close);
    box.appendChild(item);
    setTimeout(function () { item.remove(); }, Math.min(12000, 4000 + String(msg).length * 40));
  }
  window.alert = toast;
  window.__atToast = toast;
  var dlPromise = null;
  function getDownloads() {
    if (!dlPromise) {
      dlPromise = (window.claude && typeof window.claude.use === 'function')
        ? window.claude.use('downloads').catch(function () { return null; })
        : Promise.resolve(null);
      dlPromise.then(function (v) { if (!v) dlPromise = null; });
    }
    return dlPromise;
  }
  var HINT = 'บันทึกไฟล์ไม่ได้ในหน้านี้ ให้กดค้าง (มือถือ) หรือคลิกขวา (คอม) ที่รูปพรีวิว แล้วเลือก “บันทึกรูปภาพ”';
  var nativeClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (!this.hasAttribute('download')) return nativeClick.apply(this, arguments);
    var name = this.getAttribute('download') || 'AT_Honda.png';
    var blobJob = fetch(this.href).then(function (r) { return r.blob(); });
    Promise.all([blobJob, getDownloads()]).then(function (res) {
      var blob = res[0], dl = res[1];
      if (!dl) { toast(HINT); return; }
      return dl.save({ filename: name, data: blob }).then(function () {
        toast('บันทึกไฟล์แล้ว: ' + name);
      }, function (err) {
        var code = err && err.code;
        if (code === 'declined') return;
        if (code === 'rate_limited') { toast('มีหน้าต่างบันทึกไฟล์เปิดอยู่ รอสักครู่แล้วกดใหม่'); return; }
        toast(HINT);
      });
    }).catch(function () { toast(HINT); });
  };
})();
</script>
<style>
  :root { color-scheme: light; }
  #at-toast-stack { position: fixed; z-index: 2147483000; left: 50%; transform: translateX(-50%);
    bottom: calc(16px + env(safe-area-inset-bottom, 0px)); display: flex; flex-direction: column; gap: 8px;
    width: min(92vw, 520px); pointer-events: none; }
  .at-toast { pointer-events: auto; background: #111827; color: #ffffff; border-radius: 12px; padding: 10px 12px;
    font: 500 13px/1.45 'Prompt', sans-serif; box-shadow: 0 10px 24px rgba(0,0,0,.25); display: flex; gap: 10px;
    align-items: flex-start; white-space: pre-wrap; }
  .at-toast button { margin-left: auto; flex: 0 0 auto; background: #ffffff; color: #111827; border: 0;
    border-radius: 8px; padding: 2px 8px; font: 700 11px 'Prompt', sans-serif; cursor: pointer; }
</style>"""

top = """<title>AT Honda Sale Calculator</title>
<script crossorigin src="https://unpkg.com/react@18.3.1/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
<script data-auto-replace-svg="nest" src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Prompt:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
"""
tw_css = open(os.path.join(here, 'tw.css'), encoding='utf-8').read()
assert head.count('<style>') == 1 and head.count('</style>') == 1
head = head.replace('<style>', '<style>\n@layer components {', 1).replace('</style>', '}\n</style>', 1)
page = top + '<style>\n' + tw_css + '\n</style>\n' + shim + "\n" + head + body
open(out, 'w', encoding='utf-8').write(page)
print('page', len(page))
