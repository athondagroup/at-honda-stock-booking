import re, sys, math
src, out = sys.argv[1], sys.argv[2]
css = open(src, encoding='utf-8').read()
def oklch_to_hex(L, C, H, alpha=None):
    L = L / 100 if L > 1 else L
    a = C * math.cos(math.radians(H)); b = C * math.sin(math.radians(H))
    l_ = L + 0.3963377774 * a + 0.2158037573 * b; m_ = L - 0.1055613458 * a - 0.0638541728 * b; s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_ ** 3, m_ ** 3, s_ ** 3
    r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s; g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s; bb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    def enc(x):
        x = max(0.0, min(1.0, x)); x = 12.92 * x if x <= 0.0031308 else 1.055 * (x ** (1 / 2.4)) - 0.055; return round(x * 255)
    R, G, B = enc(r), enc(g), enc(bb)
    return f'rgba({R}, {G}, {B}, {alpha})' if alpha is not None and alpha < 1 else f'#{R:02x}{G:02x}{B:02x}'
def rep_oklch(m):
    parts = m.group(1).replace('/', ' / ').split()
    L = float(parts[0].rstrip('%')); C = float(parts[1]); H = float(parts[2]) if parts[2] != 'none' else 0
    alpha = None
    if '/' in parts:
        a = parts[parts.index('/') + 1]; alpha = float(a.rstrip('%')) / (100 if a.endswith('%') else 1)
    return oklch_to_hex(L, C, H, alpha)
css = re.sub(r'oklch\(([^)]*)\)', rep_oklch, css)
def drop_supports(text):
    out, i = [], 0
    pat = re.compile(r'@supports\s*\((?:color:\s*color-mix\(in lab, red, red\)|background-image:\s*linear-gradient\(in lab, red, red\))\)\s*\{')
    while True:
        m = pat.search(text, i)
        if not m: out.append(text[i:]); break
        out.append(text[i:m.start()]); depth, j = 1, m.end()
        while depth:
            if text[j] == '{': depth += 1
            elif text[j] == '}': depth -= 1
            j += 1
        i = j
    return ''.join(out)
css = drop_supports(css)
def hex_rgba(h, pct):
    h = h.lstrip('#')
    if len(h) == 3: h = ''.join(c * 2 for c in h)
    return f'rgba({int(h[0:2],16)}, {int(h[2:4],16)}, {int(h[4:6],16)}, {round(pct / 100, 3)})'
NAMED = {'white': '#ffffff', 'black': '#000000'}
def rep_mix(m):
    col, pct = m.group(1).strip(), float(m.group(2))
    col = NAMED.get(col, col)
    if col.startswith('#'): return hex_rgba(col, pct)
    rm = re.match(r'rgba?\((\d+),?\s*(\d+),?\s*(\d+)', col)
    return f'rgba({rm.group(1)}, {rm.group(2)}, {rm.group(3)}, {round(pct / 100, 3)})' if rm else m.group(0)
css = re.sub(r'color-mix\(in (?:srgb|oklab), ([^,]+?) ([\d.]+)%, transparent\)', rep_mix, css)
css = re.sub(r'(--tw-gradient-position:[^;]*?)\s+in (?:oklab|oklch|srgb)\s*;', r'\1;', css)
left = re.findall(r'(oklch|oklab|color-mix)', css)
open(out, 'w', encoding='utf-8').write(css)
print('css', len(css), 'leftovers', len(left))
