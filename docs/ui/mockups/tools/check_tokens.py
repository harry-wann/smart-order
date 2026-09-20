#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
check_tokens.py — 設計系統對帳：文件有沒有跟前端的 token 對上

以 frontend/src/styles/tokens.*.css 為**唯一的真實來源**，檢查六件事：

1. 色票  — 11-設計系統 §2.1 的 @theme 區塊，名稱與值要跟 tokens.colors.css 一字不差
2. 色票  — 設計稿 _shared.css 的舊變數，交集內的值要一致（名字不同，見 RENAME）
3. 字級  — tokens.type.css 的十個 type-* vs 11-設計系統 §3.2 的大小與行高
4. 圓角  — tokens.space.css 的 --radius-* vs 11-設計系統 §2.2 列的七個
5. 間距  — tokens.space.css 的 --spacing-* vs 11-設計系統 §4.1 的表
6. 雜色  — docs/ 的 .md 裡有沒有色票以外的 hex（允許清單見 KNOWN_HEX）

改了 token 或改了文件都跑一次。有任何不一致會列出來並回傳 exit code 1，
所以可以直接接進 CI。

用法：python3 docs/ui/mockups/tools/check_tokens.py [--quiet]
  --quiet 只印不一致的項目，全部通過時不輸出。
只用標準函式庫。
"""

import argparse
import io
import os
import re
import sys
from collections import defaultdict

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))

DS      = 'docs/ui/11-設計系統.md'
SHARED  = 'docs/ui/mockups/_shared.css'
COLORS  = 'frontend/src/styles/tokens.colors.css'
TYPE    = 'frontend/src/styles/tokens.type.css'
SPACE   = 'frontend/src/styles/tokens.space.css'
KDS     = 'frontend/src/features/admin/kds/kds.colors.css'
PAY     = 'frontend/src/features/customer/payment/payment.colors.css'

# _shared.css 的舊名 → 前端 token 名。五個為了避開 Tailwind class 撞名而改過。
RENAME = {'bg': 'paper', 'border': 'line',
          'text-900': 'ink-900', 'text-600': 'ink-600', 'text-400': 'ink-400'}

# §4.1 間距表的「用途」欄 → --spacing-* 的名字。表裡的文字改了這裡要跟著改。
SPACING_LABELS = [
    ('頁面左右留白（手機）', 'page'),
    ('卡片內距', 'card'),
    ('列表列內距（MenuItemRow 等）', 'row'),
    ('卡片之間', 'card-gap'),
    ('區塊之間', 'section'),
    ('大區塊之間', 'section-lg'),
    ('表單欄位之間', 'field'),
]

# 文件裡出現、但刻意不進色票的顏色。加新的要寫清楚為什麼。
KNOWN_HEX = {
    '#2f6fb0': '工作包 A 識別色（14 §8.1，不進 App）',
    '#3c8a4e': '工作包 B 識別色',
    '#7b4fa6': '工作包 C 識別色',
    '#1f8a8a': '工作包 D 識別色',
    '#b5487a': '工作包 E 識別色',
    '#efe9e1': 'Mermaid 圖的 classDef 配色（14 §8.1b，給看文件的人用）',
    '#aa3bff': 'Vite 樣板的紫（14 §7 的歷史紀錄，已清掉）',
    '#16171d': 'Vite 樣板的深色底（同上）',
    '#d6c9b6': '_shared.css 寫死的舊邊框色，前端已收斂成 line-strong（14 §7）',
    '#d9c7ae': '同上，已收斂成 accent-200',
    '#fadbd5': '14 §6 對比度 A/B 比較用的值',
    '#c8442d': '39-Tailwind 故意打錯的示範（brand-600 是 #c8442e）',
}


def read(rel):
    try:
        return io.open(os.path.join(ROOT, rel), encoding='utf-8').read()
    except FileNotFoundError:
        return ''


class Report(object):
    def __init__(self, quiet):
        self.quiet, self.bad = quiet, []

    def section(self, title):
        if not self.quiet:
            print('\n%s\n%s' % (title, '─' * 60))

    def ok(self, msg):
        if not self.quiet:
            print('  ✓ %s' % msg)

    def fail(self, msg):
        self.bad.append(msg)
        print('  ★ %s' % msg)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--quiet', action='store_true', help='只印不一致的項目')
    r = Report(ap.parse_args().quiet)

    ds, shared = read(DS), read(SHARED)
    colors_css, type_css, space_css = read(COLORS), read(TYPE), read(SPACE)

    impl_color = {k: v.strip().lower() for k, v in
                  re.findall(r'--color-([a-z0-9-]+):\s*([^;]+);', colors_css)}
    impl_radius = {k: v.strip() for k, v in
                   re.findall(r'--radius-([a-z0-9-]+):\s*([^;]+);', space_css)}
    impl_space = {k: v.strip() for k, v in
                  re.findall(r'--spacing-([a-z0-9-]+):\s*([^;]+);', space_css)}
    impl_type = {}
    for m in re.finditer(r'@utility (type-[a-z0-9-]+) \{(.*?)\n\}', type_css, re.S):
        body = m.group(2)
        g = lambda k: (re.search(k + r':\s*([^;]+);', body) or [None, ''])[1].strip()
        impl_type[m.group(1)] = (g('font-family').replace('var(--font-', '').rstrip(')'),
                                 g('font-size'), g('line-height'), g('font-weight'))

    # ── 1. §2.1 的 @theme vs tokens.colors.css ──────────────────────────────
    r.section('① 色票：11-設計系統 §2.1  vs  tokens.colors.css')
    blk = ds.split('@theme {', 1)[1].split('```', 1)[0] if '@theme {' in ds else ''
    doc_color = {k: v.strip().lower() for k, v in
                 re.findall(r'--color-([a-z0-9-]+):\s*([^;]+);', blk)}
    if not doc_color:
        r.fail('§2.1 找不到 @theme 區塊')
    for k in sorted(set(impl_color) - set(doc_color)):
        r.fail('§2.1 少了 --color-%s（%s）' % (k, impl_color[k]))
    for k in sorted(set(doc_color) - set(impl_color)):
        r.fail('§2.1 多了 --color-%s，tokens.colors.css 沒有' % k)
    for k in sorted(set(impl_color) & set(doc_color)):
        if impl_color[k] != doc_color[k]:
            r.fail('--color-%s 值不同：程式碼 %s ／ §2.1 %s' % (k, impl_color[k], doc_color[k]))
    if not r.bad:
        r.ok('%d 個色票名稱與值完全一致' % len(impl_color))

    # ── 2. _shared.css（設計稿）交集內的值 ──────────────────────────────────
    r.section('② 色票：_shared.css（設計稿）  vs  tokens.colors.css')
    shar = {RENAME.get(k, k): v.lower() for k, v in
            re.findall(r'--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})', shared)}
    diff = [k for k in set(impl_color) & set(shar)
            if not impl_color[k].startswith('var(') and impl_color[k] != shar[k]]
    for k in sorted(diff):
        r.fail('%s 值不同：程式碼 %s ／ 設計稿 %s' % (k, impl_color[k], shar[k]))
    if not diff:
        r.ok('交集 %d 個，值一致（設計稿沒有的 %d 個是前端後加的）'
             % (len(set(impl_color) & set(shar)), len(set(impl_color) - set(shar))))

    # ── 3. 字級 §3.2 ────────────────────────────────────────────────────────
    r.section('③ 字級：11-設計系統 §3.2  vs  tokens.type.css')
    n = 0
    for m in re.finditer(r'\|\s*`([a-z0-9-]+)`\s*\|\s*(\d+)\s*/\s*([\d.]+)\s*\|\s*(Serif|Sans)\s+(\d+)', ds):
        name, size, lh, fam, weight = m.groups()
        key = 'type-' + name
        if key not in impl_type:
            r.fail('§3.2 有 %s，但 tokens.type.css 沒有 @utility %s' % (name, key))
            continue
        n += 1
        f, s_, l_, w = impl_type[key]
        if s_ != size + 'px':
            r.fail('%s 大小不符：程式碼 %s ／ §3.2 %spx' % (key, s_, size))
        if l_ != lh:
            r.fail('%s 行高不符：程式碼 %s ／ §3.2 %s' % (key, l_, lh))
        if w != weight:
            r.fail('%s 字重不符：程式碼 %s ／ §3.2 %s' % (key, w, weight))
        if f != fam.lower():
            r.fail('%s 字體不符：程式碼 %s ／ §3.2 %s' % (key, f, fam))
    for key in sorted(set(impl_type)):
        if not re.search(r'\|\s*`' + re.escape(key[5:]) + r'`\s*\|', ds):
            r.fail('tokens.type.css 有 %s，但 §3.2 沒列' % key)
    if n:
        r.ok('%d 個字級的字體／大小／行高／字重都一致' % n)

    # ── 4. 圓角 §2.2 ────────────────────────────────────────────────────────
    r.section('④ 圓角：11-設計系統 §2.2  vs  tokens.space.css')
    doc_radius = dict(re.findall(r'`rounded-([a-z]+)`\((\d+)\)', ds))
    for k in sorted(set(impl_radius) - set(doc_radius)):
        r.fail('§2.2 少了 rounded-%s（%s）' % (k, impl_radius[k]))
    for k in sorted(set(impl_radius) & set(doc_radius)):
        if impl_radius[k] != doc_radius[k] + 'px':
            r.fail('rounded-%s 不符：程式碼 %s ／ §2.2 %spx' % (k, impl_radius[k], doc_radius[k]))
    if doc_radius:
        r.ok('%d 個圓角一致' % len(doc_radius))
    else:
        r.fail('§2.2 找不到 rounded-*(值) 的清單')

    # ── 5. 間距 §4.1 ────────────────────────────────────────────────────────
    r.section('⑤ 間距：11-設計系統 §4.1  vs  tokens.space.css')
    n = 0
    for label, key in SPACING_LABELS:
        m = re.search(r'\|\s*\*{0,2}' + re.escape(label) + r'\*{0,2}\s*\|\s*\*{0,2}(\d+)px', ds)
        if not m:
            r.fail('§4.1 找不到「%s」這一列（表格文字改了？同步改 SPACING_LABELS）' % label)
            continue
        if impl_space.get(key) != m.group(1) + 'px':
            r.fail('%s 不符：程式碼 --spacing-%s=%s ／ §4.1 %spx'
                   % (label, key, impl_space.get(key, '（缺）'), m.group(1)))
        else:
            n += 1
    if n:
        r.ok('%d 項間距一致' % n)

    # ── 6. 文件裡的雜色 ─────────────────────────────────────────────────────
    r.section('⑥ 雜色：docs/**/*.md 裡有沒有色票以外的 hex')
    allowed = set(v for v in impl_color.values() if v.startswith('#'))
    for f in (KDS, PAY):
        allowed |= {h.lower() for h in re.findall(r'#[0-9A-Fa-f]{6}', read(f))}
    stray = defaultdict(list)
    for dirpath, dirnames, filenames in os.walk(os.path.join(ROOT, 'docs')):
        if os.sep + 'site' in dirpath:
            continue
        for fn in filenames:
            if not fn.endswith('.md'):
                continue
            rel = os.path.relpath(os.path.join(dirpath, fn), ROOT)
            for i, line in enumerate(io.open(os.path.join(dirpath, fn), encoding='utf-8'), 1):
                for h in re.findall(r'#[0-9A-Fa-f]{6}\b', line):
                    h = h.lower()
                    if h not in allowed and h not in KNOWN_HEX:
                        stray[h].append('%s:%d' % (rel, i))
    for h, where in sorted(stray.items()):
        r.fail('%s 不在色票也不在允許清單：%s' % (h, ', '.join(where[:3])))
    if not stray:
        r.ok('沒有來路不明的 hex（允許清單 %d 個）' % len(KNOWN_HEX))

    # ── 結果 ────────────────────────────────────────────────────────────────
    if r.bad:
        print('\n不一致 %d 項。以 frontend/src/styles/tokens.*.css 為準修文件。' % len(r.bad))
        return 1
    if not r.quiet:
        print('\n全部對得上。')
    return 0


if __name__ == '__main__':
    sys.exit(main())
