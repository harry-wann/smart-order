#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 Figma 畫框連結寫回文件。

外掛匯入完成後，面板下方會列出每個畫框的 id，按「複製畫框 id」、
貼進 tools/figma-plugin/node-ids.json，再跑這支：

    python3 docs/ui/mockups/tools/figma_links.py

會改三個地方（可重複跑，每次都先清掉舊連結再重寫）：

1. 每張設計稿 HTML：畫框上方標題列的最後面加「在 Figma 開啟」
2. mockups/index.html：每張卡片底下加工作包顏色與「在 Figma 開啟」，頁首加工作包圖例
3. spec/05-開發流程與分工.md §1.4.3：填 Figma 欄

重跑外掛時同名畫框會沿用，id 不變，所以只有新增畫面時才需要重貼 id。
前提：dist/frames.json 是最新的（先跑 figma_prep.py）。
"""
import html
import json
import pathlib
import re
import sys

TOOLS = pathlib.Path(__file__).resolve().parent
ROOT = TOOLS.parent                                   # docs/ui/mockups
IDS_JSON = TOOLS / 'figma-plugin' / 'node-ids.json'
FRAMES_JSON = ROOT / 'dist' / 'frames.json'
INDEX = ROOT / 'index.html'
PLAN_MD = ROOT.parent.parent / 'spec' / '05-開發流程與分工.md'

STATES_SUFFIX = ('states-375', 'states-1280')   # figma_prep 的狀態示範批次
FILE_URL = ('https://www.figma.com/design/AFqSmBl4P5HUHTI7oKAPZt/'
            '%E7%81%AB%E9%8D%8B%E9%BB%9E%E9%A4%90%E7%B3%BB%E7%B5%B1')

sys.dont_write_bytecode = True               # 只是借 figma_prep 的函式，不要留 __pycache__
sys.path.insert(0, str(TOOLS))
from figma_prep import load_packages  # noqa: E402  讀 05 §1.4 的工作包與顏色


def url_of(node_id):
    return '%s?node-id=%s' % (FILE_URL, node_id.replace(':', '-'))


def code_of(name):
    return name.split('｜')[0].strip()


# ── 讀資料 ─────────────────────────────────────────────────────────────────

def load():
    if not IDS_JSON.exists():
        sys.exit('找不到 %s\n在 Figma 跑完外掛後，按面板上的「複製畫框 id」，貼進這個檔案。'
                 % IDS_JSON.relative_to(ROOT.parent.parent.parent))
    ids = json.loads(IDS_JSON.read_text(encoding='utf-8'))
    if not isinstance(ids, dict) or not ids:
        sys.exit('node-ids.json 應該是 {"畫框名": "節點 id"}，而且不能是空的')
    if not FRAMES_JSON.exists():
        sys.exit('找不到 dist/frames.json，先跑 figma_prep.py')
    entries = json.loads(FRAMES_JSON.read_text(encoding='utf-8'))

    # 一個 HTML 檔 → 依出現順序的畫框名（本體在前，狀態示範接在後面）
    # 狀態示範另成一個 entry（file 是「原檔名-states.html」），畫框接在本體後面
    by_file, main = {}, {}
    for e in sorted(entries, key=lambda e: e['batch'].endswith(STATES_SUFFIX)):
        if e['batch'].endswith(STATES_SUFFIX):
            src = e['file'][:-len('-states.html')] + '.html'
        else:
            src = e['file']
            main[code_of(e['frames'][0])] = e['frames'][0]   # 代號 → 主畫框名
        by_file.setdefault(src, []).extend(e['frames'])
    return ids, by_file, main


# ── 1. 每張設計稿 ──────────────────────────────────────────────────────────

FLINK_RE = re.compile(r'<a class="flink"[^>]*>.*?</a>')
META_RE = re.compile(r'(<p class="meta">)(.*?)(</p>)', re.S)


def flink(node_id, text='在 Figma 開啟'):
    return ('<a class="flink" href="%s" target="_blank" rel="noopener">%s ↗</a>'
            % (html.escape(url_of(node_id)), text))


def patch_pages(ids, by_file):
    changed, missing = 0, []
    for fn, frames in sorted(by_file.items()):
        p = ROOT / fn
        src = p.read_text(encoding='utf-8')
        i = 0

        def repl(m):
            nonlocal i
            body = FLINK_RE.sub('', m.group(2))
            if '<b>' not in body:              # 空的 meta 只是排版佔位
                return m.group(1) + body + m.group(3)
            name = frames[i] if i < len(frames) else None
            i += 1
            if name and name in ids:
                body += flink(ids[name])
            elif name:
                missing.append(name)
            return m.group(1) + body + m.group(3)

        out = META_RE.sub(repl, src)
        if i != len(frames):
            sys.exit('%s：標題列 %d 條，畫框 %d 個，對不起來' % (fn, i, len(frames)))
        if out != src:
            p.write_text(out, encoding='utf-8')
            changed += 1
    return changed, missing


# ── 2. 總覽頁 ──────────────────────────────────────────────────────────────

CELL_RE = re.compile(
    r'^([ \t]*)<div class="tcell">\n[ \t]*(<a class="tcard".*?</a>)\n'
    r'[ \t]*<div class="tfoot">.*?</div>\n[ \t]*</div>', re.S | re.M)
CARD_RE = re.compile(r'^([ \t]*)(<a class="tcard".*?</a>)', re.S | re.M)
CARD_CODE_RE = re.compile(r'<div class="code">\s*((?:DS|[CS])-\d{2}[a-z]?)\s*</div>')
LEGEND_RE = re.compile(r'\n[ \t]*<!-- figma_links:legend -->.*?<!-- /figma_links:legend -->', re.S)
LEGEND_ANCHOR = '\n  <div class="r g16 wrap mt24" style="align-items:stretch">'


def legend(pkgs):
    items = ''.join(
        '<span class="pkg" style="--pc:%s">%s・%s</span>' % (p['color'], k, html.escape(p['name']))
        for k, p in sorted(pkgs.items()))
    return ('\n  <!-- figma_links:legend -->\n'
            '  <div class="pkg-legend mt16">\n'
            '    <b>工作包</b>%s<span class="pkg adv">進階・還沒分工</span>\n'
            '    <a class="flink" href="%s" target="_blank" rel="noopener">Figma 設計稿 ↗</a>\n'
            '  </div>\n'
            '  <!-- /figma_links:legend -->' % (items, html.escape(FILE_URL)))


def patch_index(ids, main, pkg_of, pkgs):
    src = INDEX.read_text(encoding='utf-8')
    src = CELL_RE.sub(lambda m: m.group(1) + m.group(2), src)      # 先還原成原本的卡片
    src = LEGEND_RE.sub('', src)
    missing = []

    def repl(m):
        ind, card = m.group(1), m.group(2)
        cm = CARD_CODE_RE.search(card)
        if not cm:
            return m.group(0)
        code = cm.group(1)
        foot = ''
        if code in pkg_of:
            p = pkgs[pkg_of[code]]
            foot += '<span class="pkg" style="--pc:%s">工作包 %s</span>' % (p['color'], p['id'])
        elif code.startswith(('C-', 'S-')):
            foot += '<span class="pkg adv">進階</span>'
        else:
            foot += '<span class="pkg none">元件總表</span>'
        name = main.get(code)
        if name in ids:
            foot += flink(ids[name])
        else:
            missing.append(code)
            foot += '<span class="flink off">Figma 還沒匯入</span>'
        return ('%s<div class="tcell">\n%s%s\n%s<div class="tfoot">%s</div>\n%s</div>'
                % (ind, ind, card, ind, foot, ind))

    src = CARD_RE.sub(repl, src)
    if LEGEND_ANCHOR not in src:
        sys.exit('index.html 找不到放圖例的位置（第一個 .r.g16 區塊）')
    src = src.replace(LEGEND_ANCHOR, legend(pkgs) + LEGEND_ANCHOR, 1)
    INDEX.write_text(src, encoding='utf-8')
    return missing


# ── 3. 05 §1.4.3 ──────────────────────────────────────────────────────────

ROW_RE = re.compile(r'^(\|\s*([CS]-\d{2}[a-z]?)\s*\|[^|]*\|\s*[A-E]\s*\|[^|]*\|)\s*[^|]*\|\s*$')


def patch_plan(ids, main):
    lines = PLAN_MD.read_text(encoding='utf-8').split('\n')
    n, missing = 0, []
    for k, line in enumerate(lines):
        m = ROW_RE.match(line)
        if not m:
            continue
        name = main.get(m.group(2))
        if name in ids:
            cell = '[開啟](%s)' % url_of(ids[name])
            n += 1
        else:
            cell = '—'
            missing.append(m.group(2))
        lines[k] = '%s %s |' % (m.group(1), cell)
    PLAN_MD.write_text('\n'.join(lines), encoding='utf-8')
    return n, missing


def main_():
    ids, by_file, main = load()
    pkg_of, pkgs = load_packages()
    unknown = sorted(set(ids) - {n for fs in by_file.values() for n in fs})
    changed, miss_pages = patch_pages(ids, by_file)
    miss_index = patch_index(ids, main, pkg_of, pkgs)
    rows, miss_plan = patch_plan(ids, main)
    total = sum(len(v) for v in by_file.values())
    print('畫框 id：%d 個（設計稿共 %d 個畫框）' % (len(ids), total))
    print('設計稿：%d 個檔案更新' % changed)
    print('總覽頁：%d 張卡片沒有 id' % len(miss_index) if miss_index else '總覽頁：卡片全部有連結')
    print('05 §1.4.3：%d 列填上連結' % rows)
    if unknown:
        print('⚠ node-ids.json 裡有設計稿沒有的畫框（可能是舊名字）：%s' % '、'.join(unknown))
    miss = sorted(set(miss_pages) | set(miss_index) | set(miss_plan))
    if miss:
        print('⚠ 還沒有 id：%s' % '、'.join(miss))
        sys.exit(1)


if __name__ == '__main__':
    main_()
