#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
figma_prep.py — HTML → Figma 匯入前的準備與檢查

1. Lint：逐檔檢查是否符合 10-UI-UX規格.md §5 與 11-設計系統.md §4 §6.4 §7
2. 打包：產出兩種匯入用 bundle（A = zip + 外部 CSS，B = 單檔內聯 CSS）
3. 產出匯入操作清單
4. 產出 frame 命名對照表

匯入本身沒辦法寫腳本：Figma REST API 的四個寫入 scope
（comments / dev_resources / variables / webhooks）都不能建立設計節點。
最後一定是人在瀏覽器裡用 html.to.design 或 Code to canvas 手動上傳。

用法：python3 docs/ui/mockups/tools/figma_prep.py [--lint]
只用標準函式庫。
"""

import argparse
import html as html_mod
import re
import sys
import zipfile
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'
SHARED_CSS = ROOT / '_shared.css'
SKIP = {'index.html'}

SPACING_SCALE = {0, 4, 8, 12, 16, 24, 32, 48, 64}

SPACING_EXCEPTIONS = {
    'padding:20px':      '例外1 卡片內距 20px',
    'padding:0 20px':    '例外3 按鈕 md 左右 20px',
    'padding:16px 20px': '例外1 卡片內距 20px',
    'padding:2px 10px':  '例外2 膠囊標籤 2px 10px',
    'padding:2px 8px':   '例外2 膠囊標籤（售完印章）',
    'padding:0 14px':    '例外3 按鈕 sm 左右 14px',
    'margin-top:2px':    '例外4 光學對齊',
}

FRAME_SPEC = {'f-mobile': (375, 812), 'f-desk': (1280, 800), 'f-kds': (1920, 1080)}
SIZE_EXCEPTION = {
    'c02-open-table.html': ('f-desk', '編號在顧客端，實際是櫃檯畫面'),
    's04-kds.html':        ('f-kds',  '固定橫式大螢幕，不做 RWD'),
}

TITLE_RE = re.compile(r'<title>\s*([CS]-\d{2}b?｜[^<]+?)\s*</title>')
FRAME_OPEN_RE = re.compile(r'<div class="frame (f-[a-z]+)"[^>]*>')
META_RE = re.compile(r'<p class="meta">(.*?)</p>', re.S)
CODE_RE = re.compile(r'<code>(.*?)</code>', re.S)
SIZE_CODE_RE = re.compile(r'^\d+\s*×\s*\d+$')
SPACING_PROP_RE = re.compile(
    r'\b(margin|padding|gap|row-gap|column-gap)(-top|-right|-bottom|-left)?\s*:\s*([^;{}"\']+)')
PX_RE = re.compile(r'(-?\d+(?:\.\d+)?)px')
EMOJI_RE = re.compile('[\U0001F000-\U0001FAFF☀-➿️←-⇿⬀-⯿★☆]')
PURPLE_WORDS = ['purple', 'violet', 'indigo', 'fuchsia', 'magenta']
HEX_RE = re.compile(r'#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b')


def hex_to_hsl(code):
    h = code.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    r, g, b = (int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))
    mx, mn = max(r, g, b), min(r, g, b)
    d = mx - mn
    li = (mx + mn) / 2
    if d == 0:
        return 0.0, 0.0, li
    s = d / (2 - mx - mn) if li > 0.5 else d / (mx + mn)
    if mx == r:
        hu = ((g - b) / d) % 6
    elif mx == g:
        hu = (b - r) / d + 2
    else:
        hu = (r - g) / d + 4
    return hu * 60, s, li


def purple_hexes(text):
    """色相 250–300 度、彩度夠高的顏色 = 紫／靛／藍紫。比用色碼樣式比對可靠。"""
    out = set()
    for m in HEX_RE.finditer(text):
        hu, s, li = hex_to_hsl(m.group(0))
        if 250 <= hu <= 300 and s >= 0.25 and 0.15 <= li <= 0.85:
            out.add(m.group(0).lower())
    return sorted(out)


def lint_white_bg(text, res, where):
    """頁面底色不能用純白，要用 #FBF7F0。"""
    low = text.lower()
    for m in re.finditer(r'(body|\.frame|\.f-mobile|\.f-desk)[^{}]*\{([^}]*)\}', low):
        if re.search(r'background(-color)?\s*:\s*#(fff|ffffff)\b', m.group(2)):
            res.fail('頁面底色', '%s 的 %s 用純白當底色，應為 #FBF7F0' % (where, m.group(1)))
    for m in re.finditer(r'class="frame[^"]*"[^>]*style="([^"]*)"', text):
        if re.search(r'background(-color)?\s*:\s*#(fff|ffffff)\b', m.group(1), re.I):
            res.fail('頁面底色', '%s 畫框 inline style 用純白' % where)
COLD_GRAY = ['#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0', '#f1f5f9', '#6b7280',
             '#9ca3af', '#d1d5db', '#f3f4f6', '#e5e7eb', '#111827', '#374151']

FONT_LINKS = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    '<link href="https://fonts.googleapis.com/css2?'
    'family=Noto+Sans+TC:wght@400;500;700;900&'
    'family=Noto+Serif+TC:wght@700;900&display=swap" rel="stylesheet">'
)

IMPORT_OVERRIDE = """
/* 匯入用覆寫：畫框就是頁面本身，不要舞台留白與陰影 */
html,body{margin:0;padding:0;background:var(--bg)}
body{display:flex;flex-wrap:wrap;align-items:flex-start;gap:0}
.frame{box-shadow:none}
"""


def extract_frames(src):
    out = []
    for m in FRAME_OPEN_RE.finditer(src):
        start, i, depth = m.start(), m.end(), 1
        while depth > 0:
            nxt = re.search(r'<div\b|</div>', src[i:])
            if not nxt:
                raise ValueError('frame 區塊的 </div> 沒有配對')
            tok = nxt.group(0)
            i += nxt.end()
            depth += 1 if tok == '<div' else -1
        out.append((m.group(1), src[start:i]))
    return out


def frame_states(src, n):
    labels = []
    for meta in META_RE.findall(src)[:n]:
        picked = ''
        for code in CODE_RE.findall(meta):
            c = html_mod.unescape(re.sub(r'<[^>]+>', '', code)).strip()
            if SIZE_CODE_RE.match(c) or c.startswith('/') or c.startswith('彈出層') or c.startswith('固定'):
                continue
            picked = c
            break
        labels.append(picked)
    while len(labels) < n:
        labels.append('')
    return labels


def strip_import(css):
    return re.sub(r'@import\s+url\([^)]*\);\s*', '', css, count=1)


def frame_inner_text(src):
    b = re.sub(r'<p class="meta">.*?</p>', '', src, flags=re.S)
    b = re.sub(r'<div class="sidenote">.*?</div>\s*</div>', '', b, flags=re.S)
    return re.sub(r'<!--.*?-->', '', b, flags=re.S)


# ── 1. Lint ─────────────────────────────────────────────────────────────────

class Result:
    def __init__(self, name):
        self.name, self.fails, self.notes = name, [], []

    def fail(self, check, detail):
        self.fails.append((check, detail))

    def note(self, text):
        self.notes.append(text)

    @property
    def ok(self):
        return not self.fails


def lint_spacing(text, where, res, is_css):
    if is_css:
        chunks = [re.sub(r'/\*.*?\*/', '', text, flags=re.S)]
    else:
        chunks = re.findall(r'style="([^"]*)"', text)
    for chunk in chunks:
        for m in SPACING_PROP_RE.finditer(chunk):
            decl = re.sub(r'\s+', ' ', m.group(0).strip())
            bad = [float(v) for v in PX_RE.findall(m.group(3))
                   if abs(float(v)) not in SPACING_SCALE]
            if not bad:
                continue
            if decl in SPACING_EXCEPTIONS:
                res.note('間距例外 %s（%s）' % (decl, SPACING_EXCEPTIONS[decl]))
            else:
                res.fail('8px 刻度', '%s %s → %s' % (where, decl, bad))


def lint_file(path, css):
    src = path.read_text(encoding='utf-8')
    res = Result(path.name)

    # 1 畫框寬度寫死
    frames = extract_frames(src)
    if not frames:
        res.fail('畫框', '找不到 .frame')
    classes = {c for c, _ in frames}
    expected = SIZE_EXCEPTION.get(path.name, (None, None))[0]
    if expected is None:
        expected = 'f-desk' if path.name.startswith('s') else 'f-mobile'
    if classes != {expected}:
        res.fail('畫框尺寸', '用了 %s，應該是 %s' % (sorted(classes), expected))
    for cls in classes:
        rule = re.search(r'\.' + cls + r'\s*\{([^}]*)\}', css)
        if not rule:
            res.fail('畫框尺寸', '_shared.css 找不到 .%s' % cls)
            continue
        body = rule.group(1)
        w = re.search(r'width\s*:\s*(\d+)px', body)
        h = re.search(r'height\s*:\s*(\d+)px', body)
        if not w or not h:
            res.fail('畫框尺寸', '.%s 沒寫死 width/height' % cls)
        elif (int(w.group(1)), int(h.group(1))) != FRAME_SPEC[cls]:
            res.fail('畫框尺寸', '.%s 是 %sx%s，應為 %s' % (cls, w.group(1), h.group(1), FRAME_SPEC[cls]))
        if '%' in body or 'max-width' in body:
            res.fail('畫框尺寸', '.%s 用了 %% 或 max-width，匯入時寬度會跑掉' % cls)

    # 2 title 格式
    t = TITLE_RE.search(src)
    if not t:
        raw = re.search(r'<title>(.*?)</title>', src, re.S)
        res.fail('title 格式', '不是「代號｜中文名」：%s' % (raw.group(1).strip() if raw else '沒有 title'))
    else:
        res.note('title = %s' % t.group(1))

    # 3 圖片佔位三行
    n_ph = 0
    for tag, inner in re.findall(r'(<div class="img-ph[^>]*>)(.*?)</div>', src, re.S):
        n_ph += 1
        if 'data-layer=' not in tag:
            res.fail('圖片佔位', '缺 data-layer（Figma 圖層名）')
        if inner.count('<b>') != 1:
            res.fail('圖片佔位', '缺第 1 行「放什麼圖」')
        if inner.count('<span') < 2:
            res.fail('圖片佔位', '缺第 2/3 行（尺寸比例、搜尋關鍵字）')
    res.note('圖片佔位 %d 個' % n_ph)

    # 4 頁面底色不能純白
    low = src.lower()
    lint_white_bg(src, res, path.name)

    # 5 紫色／漸層／冷灰
    for w in PURPLE_WORDS:
        if w in low:
            res.fail('紫色', '出現關鍵字 %s' % w)
    for hx in purple_hexes(src):
        res.fail('紫色', '色碼 %s 落在紫／靛色相區' % hx)
    for g in re.findall(r'linear-gradient\([^)]*\)', low):
        if '43,33,28' not in g:
            res.fail('漸層', '非照片遮罩的漸層 %s' % g[:48])
    for c in COLD_GRAY:
        if c in low:
            res.fail('冷灰', 'Tailwind 預設灰 %s' % c)

    # 6 emoji
    hits = sorted(set(EMOJI_RE.findall(frame_inner_text(src))))
    if hits:
        res.fail('emoji', '畫框內出現 %s' % ''.join(hits))

    # 7 8px 刻度（inline style）
    lint_spacing(src, path.name, res, is_css=False)

    # 8 img alt
    imgs = re.findall(r'<img\b[^>]*>', src)
    for tag in imgs:
        if 'alt=' not in tag:
            res.fail('img alt', '缺 alt：%s' % tag[:60])
    res.note('<img> %d 個（設計稿用 .img-ph 佔位與 inline SVG，正常為 0）' % len(imgs))

    return res, frames


def run_lint():
    css = SHARED_CSS.read_text(encoding='utf-8')
    files = sorted(p for p in ROOT.glob('*.html') if p.name not in SKIP)

    cres = Result('_shared.css')
    lint_spacing(css, '_shared.css', cres, is_css=True)
    lint_white_bg(css, cres, '_shared.css')
    low = css.lower()
    for w in PURPLE_WORDS:
        if w in low:
            cres.fail('紫色', '出現關鍵字 %s' % w)
    for hx in purple_hexes(css):
        cres.fail('紫色', '色碼 %s 落在紫／靛色相區' % hx)
    for c in COLD_GRAY:
        if c in low:
            cres.fail('冷灰', 'Tailwind 預設灰 %s' % c)
    for g in re.findall(r'linear-gradient\([^)]*\)', low):
        if not any(k in g for k in ('43,33,28', 'rgba(0,0,0', 'rgba(255,255,255')):
            cres.fail('漸層', '非照片遮罩的漸層 %s' % g[:48])
    if '--bg:#FBF7F0' not in css:
        cres.fail('色票', '--bg 不是 #FBF7F0')

    results, frames_by_file = [cres], {}
    for p in files:
        r, fr = lint_file(p, css)
        results.append(r)
        frames_by_file[p.name] = fr
    return results, frames_by_file


# ── 2. 打包 ─────────────────────────────────────────────────────────────────

def build_page(title, blocks, inline_css=None):
    if inline_css:
        style = '<style>\n%s\n%s</style>' % (inline_css, IMPORT_OVERRIDE)
    else:
        style = '<link rel="stylesheet" href="_shared.css">\n<style>%s</style>' % IMPORT_OVERRIDE
    return ('<!DOCTYPE html>\n<html lang="zh-Hant">\n<head>\n<meta charset="utf-8">\n'
            '<title>%s</title>\n%s\n%s\n</head>\n<body>\n%s\n</body>\n</html>\n'
            % (title, FONT_LINKS, style, '\n'.join(blocks)))


def plan(frames_by_file):
    css = SHARED_CSS.read_text(encoding='utf-8')
    items = []
    for name in sorted(frames_by_file):
        src = (ROOT / name).read_text(encoding='utf-8')
        title = TITLE_RE.search(src).group(1)
        frames = frames_by_file[name]
        cls = frames[0][0]
        states = frame_states(src, len(frames))
        page = '02 顧客端' if name.startswith('c') else '03 店家端'
        stem = name[:-5]

        if cls == 'f-mobile':
            batch = '01-customer-375'
        elif cls == 'f-kds':
            batch = '04-admin-1920'
        elif name.startswith('c'):
            batch = '02-customer-1280'
        else:
            batch = '03-admin-1280'

        items.append(dict(stem=stem, src=name, title=title, page=page, batch=batch,
                          cls=cls, blocks=[frames[0][1]], frame_names=[title]))
        if len(frames) > 1:
            extra = ['%s・%s' % (title, s or '狀態%d' % (i + 2))
                     for i, s in enumerate(states[1:])]
            # 三態檔的 viewport 要跟本體一樣，不能混在同一批
            sb = '05-states-375' if cls == 'f-mobile' else '06-states-1280'
            items.append(dict(stem=stem + '-states', src=name, title='%s・三態' % title,
                              page=page, batch=sb, cls=cls,
                              blocks=[b for _, b in frames[1:]], frame_names=extra))
    return items, css


def build(items, css):
    # 不刪目錄、只覆寫。有些環境沒有刪除權限，而且「先 rm -rf 再重建」
    # 只要中途失敗就會把上一版一起弄丟。改成產完之後回報殘留檔。
    (DIST / 'A-zip').mkdir(parents=True, exist_ok=True)
    (DIST / 'B-inlined').mkdir(parents=True, exist_ok=True)
    inline_css = strip_import(css)
    batches = {}
    for it in items:
        (DIST / 'B-inlined' / (it['stem'] + '.html')).write_text(
            build_page(it['title'], it['blocks'], inline_css=inline_css), encoding='utf-8')
        batches.setdefault(it['batch'], []).append(
            (it['stem'] + '.html', build_page(it['title'], it['blocks'])))
    for batch, files in sorted(batches.items()):
        with zipfile.ZipFile(DIST / 'A-zip' / (batch + '.zip'), 'w', zipfile.ZIP_DEFLATED) as z:
            z.writestr('_shared.css', css)
            for fn, content in files:
                z.writestr(fn, content)
    return batches


def stale_files(items, batches):
    """列出 dist 裡不是這次產生的檔案（上一版殘留），交給人決定要不要刪。"""
    want = {DIST / 'B-inlined' / (it['stem'] + '.html') for it in items}
    want |= {DIST / 'A-zip' / (b + '.zip') for b in batches}
    want |= {DIST / '匯入操作清單.md', DIST / 'frame命名對照表.md', DIST / 'lint-report.md'}
    found = set()
    for sub, pat in (('A-zip', '*.zip'), ('B-inlined', '*.html')):
        found |= set((DIST / sub).glob(pat))
    found |= set(DIST.glob('*.md'))
    return sorted(found - want)


# ── 3 & 4. 文件 ─────────────────────────────────────────────────────────────

BATCH_META = {
    '01-customer-375':    ('02 顧客端', 375,  '顧客端手機直式'),
    '02-customer-1280':   ('02 顧客端', 1280, 'C-02 是櫃檯畫面，尺寸例外'),
    '03-admin-1280':      ('03 店家端', 1280, '店家端橫式'),
    '04-admin-1920':      ('03 店家端', 1920, 'S-04 KDS 固定大螢幕，尺寸例外'),
    '05-states-375':    ('02 顧客端', 375,  '選配：C-04 菜單主頁的載入中／空資料／錯誤'),
    '06-states-1280':   ('03 店家端', 1280, '選配：S-02 桌況總覽的載入中／空資料／錯誤'),
}
ORDER = ['01-customer-375', '02-customer-1280', '03-admin-1280',
         '04-admin-1920', '05-states-375', '06-states-1280']
OPTIONAL = {'05-states-375', '06-states-1280'}


def write_import_guide(items):
    L = ['# Figma 匯入操作清單\n',
         '> 由 `tools/figma_prep.py` 產生，不要手改。改完 HTML 重跑一次。\n',
         '目標檔案：**🔥 火鍋點餐系統**　`AFqSmBl4P5HUHTI7oKAPZt`\n',
         '```\n🔥 火鍋點餐系統\n├─ 01 Design System\n├─ 02 顧客端        ← C-01 ～ C-21\n'
         '└─ 03 店家端        ← S-01 ～ S-12\n```\n',
         '## 為什麼這一步不能自動化\n',
         'Figma REST API 只有四個寫入 scope（comments / dev_resources / variables / webhooks），'
         '沒有一個能建立設計節點。所以沒有任何腳本可以把 HTML 變成 frame，'
         '最後一定是人在瀏覽器裡上傳。\n',
         '| 工具 | 怎麼用 | 順序 |\n|---|---|---|',
         '| **html.to.design** | Figma 外掛 → Import → Upload，免費版可傳本地 `.html` / `.zip` | 先試這個 |',
         '| **Code to canvas** | Chrome 擴充套件擷取網頁 → 貼進 Figma | 上面吃不到 CSS 時 |\n',
         '## 先試 A，不行換 B\n',
         '| | 位置 | 說明 |\n|---|---|---|',
         '| **A** | `dist/A-zip/*.zip` | 每包都含 `_shared.css`，檔案小 |',
         '| **B** | `dist/B-inlined/*.html` | CSS 內聯進單檔，工具讀不到外部 CSS 時用 |\n',
         '> 字體用 Google Fonts 的 Noto Sans TC / Noto Serif TC，Figma 內建這兩套，不用另外裝。\n',
         '## 匯入批次\n',
         '**每一批的 viewport 寬度不一樣，換批一定要改。**viewport 沒改，畫框寬度就會跑掉。\n']

    for bi, batch in enumerate(ORDER, 1):
        group = [i for i in items if i['batch'] == batch]
        if not group:
            continue
        page, vw, why = BATCH_META[batch]
        n_frames = sum(len(i['frame_names']) for i in group)
        L += ['### 第 %d 批　`%s`\n' % (bi, batch),
              '- **匯入到**：`%s` 頁' % page,
              '- **viewport 寬度**：`%d`' % vw,
              '- **檔案**：%d 個 → **%d 個 frame**' % (len(group), n_frames),
              '- **說明**：%s\n' % why,
              '| # | 檔案 | frame 名稱 |\n|---|---|---|']
        n = 0
        for it in group:
            for fn in it['frame_names']:
                n += 1
                L.append('| %d | `%s.html` | `%s` |' % (n, it['stem'], fn))
        L.append('')

    main_n = sum(len(i['frame_names']) for i in items if i['batch'] not in OPTIONAL)
    L += ['## 匯完檢查\n',
          '- [ ] `02 顧客端` 21 個 frame、`03 店家端` 12 個 frame（共 %d 個）' % main_n,
          '- [ ] 每個 frame 寬度是 375 / 1280 / 1920，沒有被 viewport 拉成別的數字',
          '- [ ] frame 名稱照 `frame命名對照表.md` 改好',
          '- [ ] 圖片佔位框的圖層名是 `IMG／肉盤／1-1` 這種格式',
          '- [ ] 標題是思源宋體、底色 #FBF7F0，沒有變成系統無襯線與純白\n']
    (DIST / '匯入操作清單.md').write_text('\n'.join(L), encoding='utf-8')


def write_name_table(items):
    L = ['# Figma frame 命名對照表\n',
         '> 由 `tools/figma_prep.py` 產生，不要手改。\n',
         '匯入工具不一定會拿 `<title>` 當 frame 名稱，常常變成 `Frame 123`。'
         '匯完照這張表改一次，前端在 Inspect 面板才找得到東西。\n',
         '## 畫框\n',
         '| 檔名 | Figma frame 名稱 | 放哪一頁 | 尺寸 |\n|---|---|---|---|']
    for it in sorted(items, key=lambda x: (x['batch'], x['stem'])):
        w, h = FRAME_SPEC[it['cls']]
        for fn in it['frame_names']:
            L.append('| `%s.html` | `%s` | %s | %d × %d |' % (it['stem'], fn, it['page'], w, h))

    layers = Counter()
    for p in sorted(ROOT.glob('*.html')):
        if p.name in SKIP:
            continue
        for l in re.findall(r'data-layer="([^"]+)"', p.read_text(encoding='utf-8')):
            layers[l] += 1
    L += ['\n## 圖片佔位的圖層名\n',
          '格式 `IMG／主體／比例`。前端在 Inspect 面板點到框就知道要放什麼圖、什麼比例。\n',
          '| 圖層名 | 出現次數 |\n|---|---|']
    for l, c in sorted(layers.items()):
        L.append('| `%s` | %d |' % (l, c))
    L.append('\n搜尋關鍵字寫在佔位框第三行，以及 `11-設計系統.md` §6.5 的兩張對照表。\n')
    (DIST / 'frame命名對照表.md').write_text('\n'.join(L), encoding='utf-8')


def write_lint_report(results):
    n_fail = sum(len(r.fails) for r in results)
    L = ['# Lint 報告\n', '> 由 `tools/figma_prep.py` 產生。\n',
         '**%d 個檔案，%d 個問題。**\n' % (len(results), n_fail),
         '| 檔案 | 結果 | 問題 |\n|---|---|---|']
    for r in results:
        L.append('| `%s` | PASS | — |' % r.name if r.ok else
                 '| `%s` | **FAIL** | %s |' % (r.name, '<br>'.join('%s：%s' % f for f in r.fails)))
    bad = [r for r in results if not r.ok]
    if bad:
        L.append('\n## 要修的\n')
        for r in bad:
            L.append('### %s' % r.name)
            for c, d in r.fails:
                L.append('- **%s** — %s' % (c, d))
    ex = Counter()
    for r in results:
        for n in r.notes:
            if n.startswith('間距例外'):
                ex[n.replace('間距例外 ', '')] += 1
    if ex:
        L += ['\n## 間距例外（11-設計系統.md §4.1.1，不是錯）\n', '| 宣告 | 次數 |\n|---|---|']
        for k, v in sorted(ex.items()):
            L.append('| %s | %d |' % (k, v))
    (DIST / 'lint-report.md').write_text('\n'.join(L), encoding='utf-8')
    return n_fail


# ── 5. 自我驗證 ─────────────────────────────────────────────────────────────

def verify(items):
    problems = []
    inlined = [DIST / 'B-inlined' / (it['stem'] + '.html') for it in items]
    missing = [p.name for p in inlined if not p.exists()]
    if missing:
        problems.append('B-inlined 少了：%s' % missing)
    inlined = [p for p in inlined if p.exists()]

    css_len = len(strip_import(SHARED_CSS.read_text(encoding='utf-8')))
    for p in inlined:
        t = p.read_text(encoding='utf-8')
        if '<link rel="stylesheet" href="_shared.css">' in t:
            problems.append('%s 還在連外部 CSS' % p.name)
        if len(t) < css_len:
            problems.append('%s 沒有把 CSS 內聯進去' % p.name)
        if 'class="meta"' in t or 'class="sidenote"' in t:
            problems.append('%s 還留著預覽用的說明層' % p.name)
        if not TITLE_RE.search(t):
            problems.append('%s title 格式不對' % p.name)
        if 'class="frame' not in t:
            problems.append('%s 沒有畫框' % p.name)
        if 'id="thumbmode"' in t:
            problems.append('%s 還留著縮圖開關' % p.name)

    for z in sorted((DIST / 'A-zip').glob('*.zip')):
        with zipfile.ZipFile(z) as zf:
            if zf.testzip():
                problems.append('%s 壓縮檔壞了' % z.name)
            names = zf.namelist()
            if '_shared.css' not in names:
                problems.append('%s 少了 _shared.css' % z.name)
            for n in names:
                if not n.endswith('.html'):
                    continue
                c = zf.read(n).decode('utf-8')
                if 'href="_shared.css"' not in c:
                    problems.append('%s/%s 沒有連到 _shared.css' % (z.name, n))
                if 'class="sidenote"' in c or 'class="meta"' in c:
                    problems.append('%s/%s 還留著說明層' % (z.name, n))

    names = [fn for it in items for fn in it['frame_names']]
    dup = [k for k, v in Counter(names).items() if v > 1]
    if dup:
        problems.append('frame 名稱重複：%s' % dup)

    per_page = Counter()
    for it in items:
        if it['batch'] not in OPTIONAL:
            per_page[it['page']] += len(it['frame_names'])
    if per_page.get('02 顧客端') != 21:
        problems.append('顧客端 frame 數是 %s，應為 21' % per_page.get('02 顧客端'))
    if per_page.get('03 店家端') != 12:
        problems.append('店家端 frame 數是 %s，應為 12' % per_page.get('03 店家端'))
    return problems


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--lint', action='store_true', help='只檢查，不產出 dist')
    args = ap.parse_args()

    print('讀取 %s' % ROOT)
    results, frames_by_file = run_lint()
    n_fail = sum(len(r.fails) for r in results)

    print('\n── Lint ' + '─' * 54)
    for r in results:
        print('  %-4s %-30s' % ('FAIL' if r.fails else 'PASS', r.name))
        for c, d in r.fails:
            print('       ! %s：%s' % (c, d))
    print('  %d 個檔案，%d 個問題' % (len(results), n_fail))

    if args.lint:
        return 1 if n_fail else 0

    items, css = plan(frames_by_file)
    batches = build(items, css)
    write_import_guide(items)
    write_name_table(items)
    write_lint_report(results)

    print('\n── 打包 ' + '─' * 54)
    for b, fs in sorted(batches.items()):
        n = sum(len(i['frame_names']) for i in items if i['batch'] == b)
        print('  A-zip/%-24s %2d 檔 → %2d frame' % (b + '.zip', len(fs), n))
    print('  B-inlined/%-24s %2d 檔' % ('', len(items)))

    stale = stale_files(items, batches)
    if stale:
        print('\n  殘留檔（上一版留下的，確認後自行刪除）：')
        for f in stale:
            print('    - %s' % f.relative_to(DIST))

    print('\n── 自我驗證 ' + '─' * 50)
    problems = verify(items)
    for p in problems:
        print('  ! ' + p)
    print('  ' + ('全部通過' if not problems else '%d 個問題' % len(problems)))

    main_n = sum(len(i['frame_names']) for i in items if i['batch'] not in OPTIONAL)
    opt_n = sum(len(i['frame_names']) for i in items if i['batch'] in OPTIONAL)
    print('\n主批 %d 個 frame（顧客端 21 + 店家端 12），選配三態 %d 個' % (main_n, opt_n))
    print('輸出：%s' % DIST)
    return 1 if (n_fail or problems) else 0


if __name__ == '__main__':
    sys.exit(main())
