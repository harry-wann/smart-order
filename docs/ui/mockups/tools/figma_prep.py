#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
figma_prep.py — HTML → Figma 匯入前的準備與檢查

1. Lint：逐檔檢查是否符合 10-UI-UX規格.md §5 與 11-設計系統.md §4 §6.4 §7
2. 打包：dist/B-inlined（單檔內聯 CSS，給 extract_layout.py 量測）；
   dist/A-zip（zip + 外部 CSS）是舊的手動上傳備援，外掛流程用不到
3. 產出 dist/frames.json（畫框名、所屬頁、流程列、級別、13 的說明卡）
4. 產出匯入操作清單、frame 命名對照表、lint 報告
5. 自我驗證：畫面數、FLOW、13 的說明卡、10 的級別欄是否對得上

Figma REST API 的寫入 scope（comments / dev_resources / variables / webhooks）
都不能建立設計節點，所以匯入靠自己寫的 Figma 外掛（tools/figma-plugin/）：
  figma_prep.py → extract_layout.py 量出 layout.json → build_plugin.py 產 code.js
  → node test_plugin.js 實跑 → 在 Figma 桌面版執行外掛。細節見 tools/README.md。

用法：python3 docs/ui/mockups/tools/figma_prep.py [--lint]
  --lint 只做第 1 步、只印結果，不寫 dist/。
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

NOTES_MD = ROOT.parent / '13-畫框註解.md'
UIUX_MD = ROOT.parent / '10-UI-UX規格.md'
# 工作包分工（誰負責哪張畫面、每包的識別色）的唯一來源
PLAN_MD = ROOT.parent.parent / 'spec' / '05-開發流程與分工.md'

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

FRAME_SPEC = {'f-mobile': (375, 812), 'f-desk': (1280, 800),
              'f-kds': (1920, 1080), 'f-ds': (1280, 1200)}
# 顧客端在 Figma 上一條流程排一列，方便一眼看完整條動線。
# 這裡是唯一的分組來源：frames.json 帶著它、外掛照它排版。
# 新增畫面（顧客端、店家端都一樣）時一定要順手加進來，verify() 會擋住漏掉的。
FLOW = [
    # 01 Design System
    ('基礎', ['ds01-tokens.html', 'ds02-button.html']),
    ('輸入', ['ds03-input.html', 'ds04-choice.html']),
    ('內容', ['ds05-badge-card.html', 'ds06-row-notify.html']),
    ('狀態與店家端', ['ds07-states.html', 'ds08-admin.html']),
    # 02 顧客端
    ('入口', ['c00-entry.html']),
    ('點餐', ['c01-scan.html', 'c04-menu.html', 'c04b-menu-notify.html', 'c04c-menu-notify-order.html',
              'c05-item-detail.html',
              'c06-cart.html', 'c07-submitted.html', 'c08-tickets.html', 'c21-service-bell.html']),
    ('結帳', ['c09-checkout.html', 'c10-payment.html', 'c11-paid.html']),
    # C-20 是進階 A6，跟 C-15 一樣從 C-14 進去，排在同一列的最後
    ('會員', ['c12-login.html', 'c12b-otp.html', 'c13-register.html',
              'c14-member.html', 'c15-history.html', 'c20-points-coupons.html']),
    # 排序就是流程順序：選時段 → 訂位完成 → （可選）預先點餐。
    # C-17 排在 C-18 後面不是筆誤，代號沿用不重編（見 ui/10 的編號規則）。
    ('預約', ['c16-reserve-entry.html', 'c16b-reserve-guest.html', 'c16c-reserve-datetime.html',
              'c18-reserve-done.html', 'c17-reserve-preorder.html', 'c19-my-reservations.html']),
    # 店家端：一個功能一列。列的先後同時也是代號遞增的順序，兩種讀法都對得上。
    # S-07b／S-10b 是從人出發的選桌開桌對話框，S-03b 是櫃檯結帳的付款倒數對話框，
    # 都排在各自母畫面的後面。
    ('員工登入', ['s01-login.html']),
    ('現場桌況', ['s02-tables.html', 's02b-open-table.html', 's02c-open-waitlist.html',
                 's02d-open-reservation.html', 's03-table-detail.html',
                 's03b-checkout-countdown.html']),
    ('出菜', ['s04-kds.html']),
    ('菜單管理', ['s05-menu-admin.html', 's06-option-groups.html']),
    ('預約管理', ['s07-reservations.html', 's07b-reservation-seat.html']),
    ('座位設定', ['s08-tables-config.html']),
    ('庫存', ['s09-inventory.html']),
    ('候位', ['s10-waitlist.html', 's10b-waitlist-seat.html']),
    ('服務鈴', ['s11-service-bell-panel.html']),
    ('報表', ['s12-reports.html']),
    ('狀態示範', ['c04-menu-states.html', 's02-tables-states.html']),
]
FLOW_OF = {}
for _i, (_name, _files) in enumerate(FLOW):
    for _j, _f in enumerate(_files):
        FLOW_OF[_f] = (_i, _name, _j)

SIZE_EXCEPTION = {
    's04-kds.html':        ('f-kds',  '固定橫式大螢幕，不做 RWD'),
}

TITLE_RE = re.compile(r'<title>\s*((?:DS|[CS])-\d{2}[a-z]?｜[^<]+?)\s*</title>')
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
/* width:max-content + flex:none 是關鍵。
   畫框是 flex item，預設 flex-shrink:1 會被視窗寬度壓縮 ——
   匯入工具若用比畫框窄的 viewport（例如 1280 的畫框在 360 視窗），
   寫死的 width 會失效，frame 就以錯誤寬度被匯進 Figma。 */
body{display:flex;flex-wrap:nowrap;align-items:flex-start;gap:0;width:max-content}
.frame{box-shadow:none;flex:none}
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
        expected = ('f-ds' if path.name.startswith('ds')
                    else 'f-desk' if path.name.startswith('s') else 'f-mobile')
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
        page = ('01 Design System' if name.startswith('ds')
                else '03 店家端' if name.startswith('s') else '02 顧客端')
        stem = name[:-5]

        if name.startswith('ds'):
            batch = '00-design-system'
        elif cls == 'f-mobile':
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
            # 只留「編號｜狀態」：Figma 的畫框名是固定字級，手機框只有 375 寬，
            # 縮小檢視時長名字會被截成「C-04｜菜單主…」，四張狀態看起來一模一樣。
            # 把辨識用的狀態名往前挪，截斷也還認得出是哪一張。
            code = title.split('｜')[0]
            extra = ['%s｜%s' % (code, s or '狀態%d' % (i + 2))
                     for i, s in enumerate(states[1:])]
            # 三態檔的 viewport 要跟本體一樣，不能混在同一批
            sb = '05-states-375' if cls == 'f-mobile' else '06-states-1280'
            # 狀態示範是規格材料不是畫面，跟元件總表一起放 01 Design System，
            # 顧客端／店家端那兩頁只留真正的畫面
            items.append(dict(stem=stem + '-states', src=name, title='%s・狀態' % title,
                              page='01 Design System', batch=sb, cls=cls,
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
    want |= {DIST / '匯入操作清單.md', DIST / 'frame命名對照表.md',
             DIST / 'lint-report.md', DIST / 'frames.json'}
    found = set()
    for sub, pat in (('A-zip', '*.zip'), ('B-inlined', '*.html')):
        found |= set((DIST / sub).glob(pat))
    found |= set(DIST.glob('*.md')) | set(DIST.glob('*.json'))
    return sorted(found - want)


# ── 3 & 4. 文件 ─────────────────────────────────────────────────────────────

BATCH_META = {
    '00-design-system':   ('01 Design System', 1280, '元件總表，含各種狀態'),
    '01-customer-375':    ('02 顧客端', 375,  '顧客端手機直式'),
    '02-customer-1280':   ('02 顧客端', 1280, '顧客端橫式（目前沒有畫面用到）'),
    '03-admin-1280':      ('03 店家端', 1280, '店家端橫式'),
    '04-admin-1920':      ('03 店家端', 1920, 'S-04 KDS 固定大螢幕，尺寸例外'),
    '05-states-375':    ('01 Design System', 375,  'C-04 菜單主頁的載入中／空資料／錯誤／已結帳'),
    '06-states-1280':   ('01 Design System', 1280, 'S-02 桌況總覽的待清理確認框／載入中／空資料／錯誤'),
}
ORDER = ['00-design-system', '01-customer-375', '02-customer-1280', '03-admin-1280',
         '04-admin-1920', '05-states-375', '06-states-1280']
OPTIONAL = {'05-states-375', '06-states-1280'}


def write_import_guide(items):
    L = ['# Figma 匯入操作清單\n',
         '> 由 `tools/figma_prep.py` 產生，不要手改。改完 HTML 重跑一次。\n',
         '目標檔案：**🔥 火鍋點餐系統**　`AFqSmBl4P5HUHTI7oKAPZt`\n',
         '```\n🔥 火鍋點餐系統\n├─ 01 Design System   ← DS-01 ～ DS-08、C-04／S-02 的狀態示範\n'
         '├─ 02 顧客端        ← C-00 ～ C-21\n'
         '└─ 03 店家端        ← S-01 ～ S-12（含 S-02b～d、S-03b、S-07b、S-10b）\n```\n',
         '## 怎麼匯入\n',
         'Figma REST API 的寫入 scope（comments / dev_resources / variables / webhooks）'
         '都不能建立設計節點，所以匯入靠自己寫的外掛 `tools/figma-plugin/`：\n',
         '1. `python3 docs/ui/mockups/tools/figma_prep.py`（產 `dist/B-inlined/` 與 `dist/frames.json`）',
         '2. `python3 docs/ui/mockups/tools/extract_layout.py docs/ui/mockups/dist/B-inlined '
         'docs/ui/mockups/tools/figma-plugin/layout.json docs/ui/mockups/dist/frames.json`',
         '3. `python3 docs/ui/mockups/tools/figma-plugin/build_plugin.py`',
         '4. `node docs/ui/mockups/tools/figma-plugin/test_plugin.js docs/ui/mockups/tools/figma-plugin/code.js`',
         '5. Figma 桌面版 → Plugins → Development → 執行外掛，勾要匯入的組別',
         '6. 匯入完成後按外掛面板的「複製畫框 id」，貼進 `tools/figma-plugin/node-ids.json`，'
         '再跑 `python3 docs/ui/mockups/tools/figma_links.py` 把 Figma 連結寫回設計稿、總覽頁與 spec/05 §1.4.3\n',
         '> `dist/A-zip/` 是早期給 html.to.design 手動上傳的備援包，外掛流程用不到。\n',
         '> 字體：Figma 要有 Noto Sans TC（Regular／Medium／Bold／Black）與 Noto Serif TC（Bold／Black），'
         '缺了外掛會直接停下來。\n',
         '## 組別\n',
         '外掛的四個組別（設計系統／顧客端／店家端／狀態示範）由下面這些批次組成。'
         '`extract_layout.py` 用 2400 寬的視窗一次量完，畫框靠 `flex:none` 維持原本寬度。\n']

    for bi, batch in enumerate(ORDER, 1):
        group = [i for i in items if i['batch'] == batch]
        if not group:
            continue
        page, vw, why = BATCH_META[batch]
        n_frames = sum(len(i['frame_names']) for i in group)
        L += ['### 第 %d 批　`%s`\n' % (bi, batch),
              '- **匯入到**：`%s` 頁' % page,
              '- **畫框寬度**：`%d`' % vw,
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
    per = Counter()
    for i in items:
        if i['batch'] not in OPTIONAL:
            per[i['page']] += len(i['frame_names'])
    L += ['## 匯完檢查\n',
          '- [ ] `01 Design System` %d 個、`02 顧客端` %d 個、`03 店家端` %d 個 frame（共 %d 個）'
          % (per.get('01 Design System', 0), per.get('02 顧客端', 0),
             per.get('03 店家端', 0), main_n),
          '- [ ] 每個 frame 寬度是 375 / 1280 / 1920，沒有被量測視窗拉成別的數字',
          '- [ ] frame 名稱跟 `frame命名對照表.md` 一致（外掛會照 frames.json 命名，不用手改）',
          '- [ ] 圖片佔位框的圖層名是 `IMG／肉盤／1-1` 這種格式',
          '- [ ] 標題是思源宋體、底色 #FBF7F0，沒有變成系統無襯線與純白\n']
    (DIST / '匯入操作清單.md').write_text('\n'.join(L), encoding='utf-8')


def write_name_table(items):
    L = ['# Figma frame 命名對照表\n',
         '> 由 `tools/figma_prep.py` 產生，不要手改。\n',
         '外掛照 `frames.json` 替畫框命名，名稱就是這張表。'
         '前端在 Inspect 面板用這些名字找畫面。\n',
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


# ── 級別（基礎必做／進階有空才做）────────────────────────────────────────────
# 唯一來源是 10-UI-UX規格.md 兩張頁面表的「級別」欄。這裡只讀不寫，
# 要改分層就去改那兩張表，設計稿、註解與 Figma 會一起跟著變。
LEVEL_ROW_RE = re.compile(
    r'^\|\s*((?:DS|[CS])-\d{2}[a-z]?)\s*\|[^|]*\|\s*\*{0,2}(基礎|進階)\*{0,2}\s*\|')


def load_levels():
    """回傳 {代號: '基礎'|'進階'}。"""
    if not UIUX_MD.exists():
        return {}
    out = {}
    for line in UIUX_MD.read_text(encoding='utf-8').splitlines():
        m = LEVEL_ROW_RE.match(line.strip())
        if m:
            out[m.group(1)] = m.group(2)
    return out


def code_of(frame_name):
    return frame_name.split('｜')[0].strip()


# ── 工作包（分工）──────────────────────────────────────────────────────────
# 唯一來源是 spec/05-開發流程與分工.md §1.4：
#   §1.4.2 的工作包表：| **A** | 藍 `#2F6FB0` | 主題 | …
#   §1.4.3 的畫面對照表：| C-00 | 入口頁 | A | 1 | Figma 連結 |
# 狀態示範畫框（C-04｜載入中…）跟著代號走；元件總表與進階畫面沒有工作包。
PKG_ROW_RE = re.compile(r'^\|\s*\*\*([A-E])\*\*\s*\|\s*([^|`]*?)\s*`(#[0-9A-Fa-f]{6})`\s*\|\s*([^|]+?)\s*\|')
PKG_SCREEN_RE = re.compile(r'^\|\s*([CS]-\d{2}[a-z]?)\s*\|[^|]*\|\s*([A-E])\s*\|')


def load_packages():
    """回傳 ({代號: 'A'…}, {'A': {'id','color','name','colorName'}})。"""
    if not PLAN_MD.exists():
        return {}, {}
    screens, pkgs = {}, {}
    for line in PLAN_MD.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        m = PKG_ROW_RE.match(line)
        if m:
            pkgs[m.group(1)] = {'id': m.group(1), 'colorName': m.group(2).strip(),
                                'color': m.group(3).upper(), 'name': m.group(4).strip()}
            continue
        m = PKG_SCREEN_RE.match(line)
        if m:
            screens[m.group(1)] = m.group(2)
    return screens, pkgs


# ── 畫框註解 ────────────────────────────────────────────────────────────────
# 右側說明卡的內容來源是 ui/13-畫框註解.md，一個「## 畫框名」對一個畫框。
# 寫在那份 md 而不是寫在這裡，是因為它同時要給人看（build_site.py 會排版成網頁）。

def _plain(t):
    """把行內 markdown 拆成純文字。Figma 的文字節點沒有粗體片段，留著記號只會變亂碼。"""
    t = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', t)   # [字](連結) → 字
    t = t.replace('**', '').replace('`', '')
    return re.sub(r'\s+', ' ', t).strip()


def load_notes():
    """回傳 {畫框名: {'sub': str, 'spec': [str], 'warn': [str]}}。"""
    if not NOTES_MD.exists():
        return {}
    notes, cur, bucket = {}, None, None
    for raw in NOTES_MD.read_text(encoding='utf-8').splitlines():
        line = raw.rstrip()
        m = re.match(r'^##\s+(\S.*)$', line)
        if m:
            cur = {'sub': '', 'spec': [], 'warn': []}
            notes[m.group(1).strip()] = cur
            bucket = None
            continue
        if cur is None:
            continue
        if line.startswith('> ') and not cur['sub']:
            cur['sub'] = _plain(line[2:])
            continue
        flat = line.strip()
        if flat in ('**規格**', '**注意**'):
            bucket = 'spec' if flat == '**規格**' else 'warn'
            continue
        if bucket and flat.startswith('- '):
            cur[bucket].append(_plain(flat[2:]))
        elif bucket and flat and not flat.startswith(('#', '>', '|')) and cur[bucket]:
            # 上一條的續行（md 裡為了不超過行寬折的）
            cur[bucket][-1] += ' ' + _plain(flat)
    return notes


def write_frames_json(items):
    """畫框命名的單一來源。抽取器與外掛都讀這份，避免命名各寫一套。"""
    import json
    notes = load_notes()
    levels = load_levels()
    pkg_of, pkgs = load_packages()
    blank = {'sub': '', 'spec': [], 'warn': []}
    data = []
    for it in items:
        e = {'file': it['stem'] + '.html', 'title': it['title'], 'page': it['page'],
             'batch': it['batch'], 'cls': it['cls'],
             'w': FRAME_SPEC[it['cls']][0], 'h': FRAME_SPEC[it['cls']][1],
             'frames': it['frame_names'],
             'notes': [notes.get(fn, blank) for fn in it['frame_names']],
             'levels': [levels.get(code_of(fn), '基礎') for fn in it['frame_names']],
             'pkgs': [pkgs.get(pkg_of.get(code_of(fn), ''), None) for fn in it['frame_names']]}
        fl = FLOW_OF.get(it['stem'] + '.html')
        if fl:
            e['flow'], e['flow_name'], e['flow_i'] = fl[0], fl[1], fl[2]
        data.append(e)
    (DIST / 'frames.json').write_text(
        json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')


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
        # 畫框不能被 flex 壓縮，否則窄 viewport 匯入時寬度會失效
        if 'flex:none' not in t.split('IMPORT_OVERRIDE')[-1] and '.frame{box-shadow:none;flex:none}' not in t:
            problems.append('%s 的畫框沒有 flex:none，窄 viewport 下寬度會被壓縮' % p.name)

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
    # 數字要跟 10-UI-UX規格.md 的兩張頁面表一致（C-02、C-03 空號）。
    # 2026-09-15 第二批：新增 C-20（進階 A6）、S-07b／S-10b（選桌開桌對話框）。
    # 2026-09-16 第三批：新增 S-03b（櫃檯結帳・付款倒數）。主批 8＋25＋18＝51。
    if per_page.get('01 Design System') != 8:
        problems.append('設計系統 frame 數是 %s，應為 8' % per_page.get('01 Design System'))
    if per_page.get('02 顧客端') != 25:
        problems.append('顧客端 frame 數是 %s，應為 25' % per_page.get('02 顧客端'))
    if per_page.get('03 店家端') != 18:
        problems.append('店家端 frame 數是 %s，應為 18' % per_page.get('03 店家端'))

    # 每張都要歸在某一條流程，不然外掛排版時會掉進「其他」那一列
    for it in items:
        f = it['stem'] + '.html'
        if f not in FLOW_OF:
            problems.append('%s 沒有歸到任何一條流程，請加進 figma_prep.py 的 FLOW' % f)
    notes = load_notes()
    if not notes:
        problems.append('找不到 %s，右側說明卡會全部空白' % NOTES_MD.name)
    for fn in names:
        n = notes.get(fn)
        if not n:
            problems.append('%s 在 %s 裡沒有註解段落' % (fn, NOTES_MD.name))
            continue
        if not n['spec']:
            problems.append('%s 的註解沒有「規格」條目' % fn)
        if not n['warn']:
            problems.append('%s 的註解沒有「注意」條目' % fn)
        if len(n['spec']) + len(n['warn']) > 11:
            problems.append('%s 的註解共 %d 條，太長了（上限 11 條）'
                            % (fn, len(n['spec']) + len(n['warn'])))
        for line in n['spec'] + n['warn']:
            if len(line) > 70:
                problems.append('%s 的註解有一條 %d 字，太長了（上限 70）：%s…'
                                % (fn, len(line), line[:24]))
    for fn in sorted(set(notes) - set(names)):
        problems.append('%s 裡的「%s」已經沒有對應畫框，請移除' % (NOTES_MD.name, fn))

    levels = load_levels()
    if not levels:
        problems.append('讀不到 %s 的級別欄，Figma 上會全部標成基礎' % UIUX_MD.name)
    codes = {code_of(fn) for fn in names}
    for c in sorted(codes):
        if c.startswith('DS-'):
            continue
        if c not in levels:
            problems.append('%s 有設計稿但 %s 的頁面表沒有這一列，補不出級別' % (c, UIUX_MD.name))
    for c in sorted(set(levels) - codes):
        problems.append('%s 列在 %s 的頁面表，卻沒有對應的設計稿' % (c, UIUX_MD.name))
    adv = sorted(c for c in codes if levels.get(c) == '進階')
    if adv:
        print('  進階畫面：%s' % '、'.join(adv))

    pkg_of, pkgs = load_packages()
    if not pkgs:
        problems.append('讀不到 %s §1.4.2 的工作包表，Figma 上不會有工作包顏色' % PLAN_MD.name)
    for c in sorted(codes):
        if c.startswith('DS-'):
            continue
        lv = levels.get(c)
        if lv == '基礎' and c not in pkg_of:
            problems.append('%s 是基礎畫面，但 %s §1.4.3 沒有分給任何工作包' % (c, PLAN_MD.name))
        if lv == '進階' and c in pkg_of:
            problems.append('%s 是進階畫面，不應該出現在 %s §1.4.3（進階還沒分）' % (c, PLAN_MD.name))
    for c in sorted(set(pkg_of) - codes):
        problems.append('%s §1.4.3 的 %s 沒有對應的設計稿' % (PLAN_MD.name, c))
    for c, k in sorted(pkg_of.items()):
        if k not in pkgs:
            problems.append('%s 分給工作包 %s，但 §1.4.2 沒有這一包' % (c, k))
    if pkgs:
        cnt = Counter(pkg_of.values())
        print('  工作包：%s' % '、'.join('%s %d 張' % (k, cnt.get(k, 0)) for k in sorted(pkgs)))

    known = {f for _, fs in FLOW for f in fs}
    have = {it['stem'] + '.html' for it in items}
    for f in sorted(known - have):
        problems.append('FLOW 裡的 %s 已經不存在，請從 FLOW 移除' % f)
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
    write_frames_json(items)
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
    main_pages = Counter()
    for i in items:
        if i['batch'] not in OPTIONAL:
            main_pages[i['page']] += len(i['frame_names'])
    # 數字別寫死，不然改畫面時這行會偷偷變成假的
    print('\n主批 %d 個 frame（設計系統 %d + 顧客端 %d + 店家端 %d），選配狀態 %d 個'
          % (main_n, main_pages.get('01 Design System', 0),
             main_pages.get('02 顧客端', 0), main_pages.get('03 店家端', 0), opt_n))
    print('輸出：%s' % DIST)
    return 1 if (n_fail or problems) else 0


if __name__ == '__main__':
    sys.exit(main())
