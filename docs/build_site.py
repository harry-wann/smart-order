#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把 docs/ 下的 Markdown 轉成 docs/site/ 的靜態 HTML 文件網站。

功能：
  1. 自動探索所有 .md（site/ 除外），輸出路徑與原始結構一對一對應
  2. Mermaid 圖表用隨附的 vendor/mermaid.min.js 離線渲染
  3. 技術名詞自動連結：每頁第一次出現的術語自動連到 tech/ 的教學頁
     （術語表在 docs/tech/glossary.json，新增技術頁記得更新）

用法：
    pip3 install markdown
    python3 docs/build_site.py
"""
import html
import io
import json
import os
import re
import sys

try:
    import markdown
    import markdown.extensions.toc
except ImportError:
    sys.exit("請先安裝：pip3 install markdown")

DOCS = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(DOCS, "site")

# 側邊欄的分組與順序：(標題, 目錄, 是否可摺疊)
GROUPS = [
    ("規格文件",        "spec",            False),
    ("模組規格",        "spec/modules",    False),
    ("UI 文件",         "ui",              False),
    ("技術總表",        "tech",            False),
    ("技術 · 團隊與工具",   "tech/team",     True),
    ("技術 · 網頁運作原理", "tech/web",      True),
    ("技術 · 後端",         "tech/backend",  True),
    ("技術 · 資料庫",       "tech/database", True),
    ("技術 · 前端",         "tech/frontend", True),
    ("技術 · 即時與排程",   "tech/realtime", True),
    ("技術 · 進階",         "tech/advanced", True),
    ("技術 · 品質與部署",   "tech/quality",  True),
]

# 首頁的團隊與設計稿連結（docs/README.md 也有同一份，改名單或網址時兩邊一起改）
TEAM = ["Harry", "Clara", "Vincent", "YiTing", "ting chiu"]
FIGMA_URL = ("https://www.figma.com/design/AFqSmBl4P5HUHTI7oKAPZt/%E7%81%AB%E9%8D%8B%E9%BB%9E%E9%A4%90%E7%B3%BB%E7%B5%B1?node-id=8-55&t=OF0duX9j7OTqzk9b-1")

H1_RE = re.compile(r"^#\s+(.+?)\s*$", re.M)
MERMAID_RE = re.compile(r'<pre><code class="language-mermaid">(.*?)</code></pre>', re.S)
H2_RE = re.compile(r'<h2 id="([^"]+)">(.*?)</h2>', re.S)
TAG_RE = re.compile(r"<[^>]+>")
# 不可在其中插入連結的區域
PROTECT_RE = re.compile(
    r"(<pre\b.*?</pre>|<code\b.*?</code>|<a\b.*?</a>|<h[1-6]\b.*?</h[1-6]>|<[^>]*>)",
    re.S | re.I,
)


def read_title(path):
    with io.open(path, encoding="utf-8") as f:
        m = H1_RE.search(f.read())
    return m.group(1).strip() if m else os.path.splitext(os.path.basename(path))[0]


def nav_label(rel, title):
    """側邊欄標籤：數字前綴 + 標題"""
    stem = os.path.splitext(os.path.basename(rel))[0]
    num = stem.split("-", 1)[0]
    short = title.split("：", 1)[-1].strip() if "：" in title else title
    if title.startswith(num):
        return title
    return "%s %s" % (num, short)


def discover():
    """回傳 [(rel_md, rel_html, title, group_title)]，依 GROUPS 的順序"""
    pages, seen = [], set()
    for gtitle, gdir, _collapsible in GROUPS:
        d = os.path.join(DOCS, gdir)
        if not os.path.isdir(d):
            continue
        for name in sorted(os.listdir(d)):
            if not name.endswith(".md"):
                continue
            rel = os.path.join(gdir, name).replace(os.sep, "/")
            if rel in seen:
                continue
            seen.add(rel)
            title = read_title(os.path.join(DOCS, rel))
            pages.append((rel, rel[:-3] + ".html", title, gtitle))
    return pages


def load_glossary():
    p = os.path.join(DOCS, "tech", "glossary.json")
    if not os.path.exists(p):
        return []
    with io.open(p, encoding="utf-8") as f:
        raw = json.load(f)
    items = [(k, v + ".html") for k, v in raw.items() if not k.startswith("_")]
    # 長的術語優先比對，避免 "Git" 先吃掉 "GitHub Actions"
    items.sort(key=lambda kv: -len(kv[0]))
    return items


def autolink(body, glossary, current_html, depth):
    """把每頁第一次出現的技術名詞變成連結（程式碼、標題、既有連結內不動）

    先在「原始文字」上找出所有要插入的位置，排序、去掉重疊的，最後一次組回去。
    不能邊找邊插入——插入的網址裡含有術語，會被後面的術語再比對到一次。
    """
    up = "../" * depth
    used = set()
    parts = PROTECT_RE.split(body)
    for i in range(0, len(parts), 2):          # 偶數索引才是純文字
        text = parts[i]
        if not text.strip():
            continue
        hits = []
        for term, target in glossary:
            if term in used or target == current_html:
                continue
            pos = text.find(term)
            if pos >= 0:
                hits.append((pos, term, target))
        if not hits:
            continue
        hits.sort(key=lambda h: (h[0], -len(h[1])))
        out, cursor = [], 0
        for pos, term, target in hits:
            if pos < cursor:                   # 與前一個命中重疊，跳過
                continue
            out.append(text[cursor:pos])
            out.append('<a class="gloss" href="%s%s" title="看這個技術的白話說明">%s</a>'
                       % (up, target, term))
            cursor = pos + len(term)
            used.add(term)
        out.append(text[cursor:])
        parts[i] = "".join(out)
    return "".join(parts)


CSS = """
:root{
  --brand-700:#A63522; --brand-600:#C8442E; --brand-500:#DB5B42; --brand-100:#FBE8E3;
  --accent-500:#E8A33D; --accent-100:#FCF0DC;
  --bg:#FBF7F0; --surface:#FFFFFF; --surface-2:#F5EFE5; --line:#E6DED2;
  --t900:#2B211C; --t600:#6B5D54; --t400:#9C8E84;
  --ok:#3F7A4E; --ok-bg:#E4EFE7; --warn:#D98324; --bad:#B3261E;
  --sans:"Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,sans-serif;
  --serif:"Noto Serif TC","Songti TC","PMingLiU",serif;
  --shadow:0 1px 2px rgba(43,33,28,.06),0 4px 12px rgba(43,33,28,.05);
  --sidebar:280px;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:24px}
body{margin:0;background:var(--bg);color:var(--t900);font-family:var(--sans);
  font-size:16px;line-height:1.8;-webkit-font-smoothing:antialiased}

.layout{display:flex;min-height:100vh;align-items:flex-start}
.sidebar{width:var(--sidebar);flex:0 0 var(--sidebar);position:sticky;top:0;height:100vh;
  overflow-y:auto;background:var(--surface);border-right:1px solid var(--line);padding:22px 0 48px}
.brand{padding:0 20px 16px;border-bottom:1px solid var(--line);margin-bottom:10px}
.brand a{text-decoration:none;color:inherit;display:block}
.brand .logo{font-family:var(--serif);font-weight:900;font-size:18px;line-height:1.35;color:var(--brand-600)}
.brand .sub{font-size:11.5px;color:var(--t400);margin-top:4px;letter-spacing:.02em}
.navgroup{font-size:11px;font-weight:700;letter-spacing:.1em;color:var(--t400);
  padding:15px 20px 5px}
.sidebar a.nav{display:block;padding:6px 20px;color:var(--t600);text-decoration:none;
  font-size:14px;border-left:3px solid transparent;line-height:1.5}
.sidebar a.nav:hover{background:var(--brand-100);color:var(--brand-700)}
.sidebar a.nav.active{background:var(--brand-100);color:var(--brand-700);
  border-left-color:var(--brand-600);font-weight:700}
.sidebar details{border-top:1px solid transparent}
.sidebar details>summary{list-style:none;cursor:pointer;font-size:11px;font-weight:700;
  letter-spacing:.1em;color:var(--t400);padding:12px 20px 5px;user-select:none}
.sidebar details>summary::-webkit-details-marker{display:none}
.sidebar details>summary::before{content:"▸ ";font-size:10px}
.sidebar details[open]>summary::before{content:"▾ "}
.sidebar details>summary:hover{color:var(--brand-600)}
.sidebar .foot{padding:18px 20px;margin-top:14px;border-top:1px solid var(--line);
  font-size:11.5px;color:var(--t400);line-height:1.7}

.main{flex:1;min-width:0;display:flex;justify-content:center;padding:0 32px 96px}
.wrap{width:100%;max-width:1140px;display:flex;gap:36px;align-items:flex-start}
article{flex:1;min-width:0;max-width:880px;padding-top:40px}
.toc{width:196px;flex:0 0 196px;position:sticky;top:24px;padding-top:52px;font-size:12.5px;
  max-height:calc(100vh - 60px);overflow-y:auto}
.toc .tt{font-size:10.5px;letter-spacing:.1em;color:var(--t400);font-weight:700;margin-bottom:9px}
.toc a{display:block;color:var(--t600);text-decoration:none;padding:3px 0 3px 10px;
  border-left:2px solid var(--line);line-height:1.5}
.toc a:hover{color:var(--brand-600);border-left-color:var(--brand-500)}

.topbar{display:none;position:sticky;top:0;z-index:40;background:var(--surface);
  border-bottom:1px solid var(--line);padding:10px 16px;align-items:center;gap:12px}
.topbar .logo{font-family:var(--serif);font-weight:900;color:var(--brand-600);font-size:16px}
.menubtn{background:var(--brand-600);color:#fff;border:0;border-radius:8px;height:40px;
  padding:0 14px;font-size:15px;font-family:inherit;cursor:pointer}

article h1{font-family:var(--serif);font-weight:900;font-size:32px;line-height:1.35;margin:0 0 10px}
article h1+p{color:var(--t600)}
article h2{font-family:var(--serif);font-weight:700;font-size:24px;line-height:1.45;
  margin:50px 0 14px;padding-bottom:9px;border-bottom:2px solid var(--line)}
article h3{font-weight:700;font-size:18.5px;margin:30px 0 10px}
article h4{font-weight:700;font-size:16px;margin:22px 0 8px;color:var(--t600)}
article p{margin:0 0 16px}
article ul,article ol{margin:0 0 16px;padding-left:24px}
article li{margin:5px 0}
article a{color:var(--brand-600);text-decoration:none;border-bottom:1px solid rgba(200,68,46,.3)}
article a:hover{border-bottom-color:var(--brand-600)}
article a.gloss{color:var(--t900);border-bottom:1px dashed var(--accent-500);
  background:linear-gradient(transparent 72%,var(--accent-100) 72%)}
article a.gloss:hover{color:var(--brand-700);border-bottom-color:var(--brand-500)}
article strong{font-weight:700;color:var(--t900)}
article hr{border:0;border-top:1px solid var(--line);margin:42px 0}
article img{max-width:100%;border-radius:12px}
article details{background:var(--surface);border:1px solid var(--line);border-radius:12px;
  padding:12px 16px;margin:0 0 18px}
article details>summary{cursor:pointer;font-weight:700;color:var(--brand-600)}

article code{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-size:.87em;
  background:var(--surface-2);padding:2px 6px;border-radius:5px;color:var(--brand-700);
  word-break:break-word}
article pre{background:#2B211C;color:#F5EFE5;padding:18px 20px;border-radius:12px;
  overflow-x:auto;margin:0 0 18px;line-height:1.65;font-size:13.5px}
article pre code{background:none;color:inherit;padding:0;font-size:inherit}

blockquote{margin:0 0 20px;padding:14px 18px;background:var(--accent-100);
  border-left:4px solid var(--accent-500);border-radius:0 10px 10px 0;color:var(--t600)}
blockquote p:last-child{margin-bottom:0}
blockquote strong{color:var(--t900)}

.tablewrap{overflow-x:auto;margin:0 0 20px;border:1px solid var(--line);
  border-radius:12px;background:var(--surface);box-shadow:var(--shadow)}
table{border-collapse:collapse;width:100%;font-size:14.5px;min-width:420px}
th,td{padding:10px 14px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}
th{background:var(--surface-2);font-weight:700;white-space:nowrap;color:var(--t900)}
tbody tr:last-child td{border-bottom:0}
tbody tr:hover{background:var(--brand-100)}
td code,th code{white-space:nowrap}
article li input[type=checkbox]{width:16px;height:16px;margin-right:6px;accent-color:var(--brand-600)}

pre.mermaid{background:var(--surface);border:1px solid var(--line);border-radius:12px;
  padding:22px;text-align:center;overflow-x:auto;box-shadow:var(--shadow);margin:0 0 22px;color:inherit}
pre.mermaid svg{max-width:100%;height:auto}

.hero{padding:52px 0 32px;border-bottom:1px solid var(--line);margin-bottom:32px}
.hero .eyebrow{display:inline-block;background:var(--brand-100);color:var(--brand-700);
  font-size:12.5px;font-weight:700;padding:5px 13px;border-radius:999px;letter-spacing:.04em}
.hero h1{font-family:var(--serif);font-weight:900;font-size:40px;line-height:1.25;margin:18px 0 12px}
.hero p{font-size:17px;color:var(--t600);max-width:680px;margin:0}
.facts{display:flex;flex-wrap:wrap;gap:10px;margin-top:26px}
.fact{background:var(--surface);border:1px solid var(--line);border-radius:10px;
  padding:10px 16px;font-size:13px;box-shadow:var(--shadow)}
.fact b{display:block;font-family:var(--serif);font-size:19px;color:var(--brand-600);font-weight:900}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:13px;margin:18px 0 8px}
.card{display:block;background:var(--surface);border:1px solid var(--line);border-radius:12px;
  padding:16px;text-decoration:none;color:inherit;box-shadow:var(--shadow);transition:.15s}
.card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(43,33,28,.12);border-color:var(--brand-500)}
.card .k{font-size:10.5px;letter-spacing:.09em;color:var(--t400);font-weight:700}
.card .n{font-family:var(--serif);font-weight:700;font-size:17px;margin:5px 0 6px;color:var(--t900)}
.card .d{font-size:13px;color:var(--t600);line-height:1.6}
.callout{background:var(--brand-100);border:1px solid var(--brand-500);border-radius:12px;
  padding:18px 20px;margin:24px 0}
.callout .h{font-family:var(--serif);font-weight:700;font-size:17px;margin-bottom:6px;color:var(--brand-700)}
.callout p{margin:0;color:var(--t600);font-size:14.5px}
.pending{background:var(--accent-100);border-color:var(--accent-500)}
.pending .h{color:#8A5B12}

.pager{display:flex;gap:12px;margin-top:52px;padding-top:22px;border-top:1px solid var(--line)}
.pager a{flex:1;background:var(--surface);border:1px solid var(--line);border-radius:12px;
  padding:13px 16px;text-decoration:none;color:inherit;box-shadow:var(--shadow)}
.pager a:hover{border-color:var(--brand-500)}
.pager .k{font-size:11px;color:var(--t400);letter-spacing:.06em}
.pager .n{font-weight:700;color:var(--brand-600);margin-top:3px;font-size:14.5px}
.pager .next{text-align:right}

@media(max-width:1200px){ .toc{display:none} }
@media(max-width:940px){
  .topbar{display:flex}
  .layout{display:block}
  .sidebar{position:fixed;left:0;top:0;height:100vh;z-index:50;transform:translateX(-100%);
    transition:transform .2s;box-shadow:0 0 40px rgba(43,33,28,.2);width:286px}
  .sidebar.open{transform:translateX(0)}
  .main{padding:0 16px 72px}
  article{padding-top:24px}
  .hero{padding:30px 0 24px}
  .hero h1{font-size:30px}
  article h1{font-size:26px}
  article h2{font-size:21px;margin-top:38px}
  .pager{flex-direction:column}
}
@media print{
  .sidebar,.toc,.topbar,.pager{display:none!important}
  body{background:#fff}
  .main{padding:0}
  article{max-width:none}
  article h2{page-break-after:avoid}
  .tablewrap,pre.mermaid{box-shadow:none;page-break-inside:avoid}
  a.gloss{background:none!important;border:0!important}
}
"""

MERMAID_INIT = """
mermaid.initialize({
  startOnLoad: true, securityLevel: 'loose', theme: 'base',
  fontFamily: '"Noto Sans TC","PingFang TC",system-ui,sans-serif',
  themeVariables: {
    background:'#FFFFFF',
    primaryColor:'#FBE8E3', primaryTextColor:'#2B211C', primaryBorderColor:'#C8442E',
    secondaryColor:'#FCF0DC', secondaryBorderColor:'#E8A33D',
    tertiaryColor:'#F5EFE5', tertiaryBorderColor:'#E6DED2',
    lineColor:'#9C8E84', textColor:'#2B211C',
    mainBkg:'#FBE8E3', nodeBorder:'#C8442E', clusterBkg:'#FBF7F0', clusterBorder:'#E6DED2',
    titleColor:'#2B211C', edgeLabelBackground:'#FBF7F0',
    actorBkg:'#FBE8E3', actorBorder:'#C8442E', actorTextColor:'#2B211C',
    signalColor:'#6B5D54', signalTextColor:'#2B211C',
    labelBoxBkgColor:'#FCF0DC', labelBoxBorderColor:'#E8A33D', labelTextColor:'#2B211C',
    loopTextColor:'#2B211C', noteBkgColor:'#FCF0DC', noteBorderColor:'#E8A33D', noteTextColor:'#2B211C',
    activationBkgColor:'#E6DED2', activationBorderColor:'#9C8E84', sequenceNumberColor:'#FFFFFF',
    altBackground:'#F5EFE5',
    taskBkgColor:'#FBE8E3', taskBorderColor:'#C8442E', taskTextColor:'#2B211C',
    taskTextOutsideColor:'#2B211C', taskTextDarkColor:'#2B211C',
    activeTaskBkgColor:'#E8A33D', activeTaskBorderColor:'#C9862A',
    doneTaskBkgColor:'#E4EFE7', doneTaskBorderColor:'#3F7A4E',
    critBkgColor:'#C8442E', critBorderColor:'#A63522',
    gridColor:'#E6DED2', todayLineColor:'#B3261E',
    sectionBkgColor:'#FBF7F0', sectionBkgColor2:'#F5EFE5', altSectionBkgColor:'#FFFFFF',
    classText:'#2B211C',
    attributeBackgroundColorOdd:'#FFFFFF', attributeBackgroundColorEven:'#F5EFE5'
  },
  gantt:{barHeight:18,barGap:5,topPadding:52,leftPadding:180,fontSize:12},
  mindmap:{padding:12},
  sequence:{actorMargin:42,boxTextMargin:6,noteMargin:10,messageMargin:32,width:150},
  er:{entityPadding:12,minEntityWidth:110}
});
"""


def sidebar_html(pages, depth, current_html):
    up = "../" * depth
    out = ['<nav class="sidebar" id="sb">']
    out.append(
        '<div class="brand"><a href="%sindex.html">'
        '<div class="logo">火鍋店點餐系統</div>'
        '<div class="sub">專案文件 · %d 頁</div></a></div>' % (up, len(pages)))
    out.append('<a class="nav%s" href="%sindex.html">首頁</a>'
               % (" active" if current_html == "index.html" else "", up))

    for gtitle, gdir, collapsible in GROUPS:
        items = [p for p in pages if p[3] == gtitle]
        if not items:
            continue
        has_active = any(p[1] == current_html for p in items)
        links = "".join(
            '<a class="nav%s" href="%s%s">%s</a>'
            % (" active" if out_html == current_html else "", up, out_html,
               html.escape(nav_label(rel, title)))
            for rel, out_html, title, _g in items)
        if collapsible:
            out.append('<details%s><summary>%s（%d）</summary>%s</details>'
                       % (" open" if has_active else "", gtitle, len(items), links))
        else:
            out.append('<div class="navgroup">%s</div>%s' % (gtitle, links))

    out.append('<div class="foot">由 Markdown 自動產生<br>'
               '改文件請編輯 <code>docs/</code> 下的 .md<br>'
               '再執行 <code>python3 docs/build_site.py</code></div></nav>')
    return "".join(out)


def page_shell(title, depth, current_html, sidebar, body, toc="", pager=""):
    up = "../" * depth
    return (
        '<!doctype html>\n<html lang="zh-Hant">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
        "<title>" + html.escape(title) + " · 火鍋店點餐系統文件</title>\n"
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700'
        '&family=Noto+Serif+TC:wght@700;900&display=swap" rel="stylesheet">\n'
        "<style>" + CSS + "</style>\n</head>\n<body>\n"
        '<div class="topbar"><button class="menubtn" onclick="document.getElementById(\'sb\')'
        '.classList.toggle(\'open\')">☰ 目錄</button>'
        '<span class="logo">火鍋店點餐系統</span></div>\n'
        '<div class="layout">\n' + sidebar + '\n<div class="main"><div class="wrap">\n'
        "<article>\n" + body + pager + "\n</article>\n" + toc + "\n</div></div>\n</div>\n"
        '<script src="' + up + 'vendor/mermaid.min.js"></script>\n'
        "<script>" + MERMAID_INIT + "</script>\n"
        "<script>document.addEventListener('click',function(e){"
        "var sb=document.getElementById('sb');"
        "if(window.innerWidth<=940&&sb.classList.contains('open')"
        "&&!sb.contains(e.target)&&!e.target.closest('.menubtn')){sb.classList.remove('open');}"
        "});</script>\n</body>\n</html>\n")


def convert(md_text):
    # slugify_unicode：標題 id 保留中文（跟 GitHub 一樣），文件裡的 #中文錨點 才連得到
    md = markdown.Markdown(extensions=["extra", "toc", "sane_lists"],
                           extension_configs={"toc": {"permalink": False,
                                                      "slugify": markdown.extensions.toc.slugify_unicode}})
    out = md.convert(md_text)
    out = MERMAID_RE.sub(lambda m: '<pre class="mermaid">' + html.unescape(m.group(1)) + "</pre>", out)
    out = out.replace("<table>", '<div class="tablewrap"><table>').replace("</table>", "</table></div>")
    out = out.replace("<li>[ ] ", '<li><input type="checkbox" disabled> ')
    out = out.replace("<li>[x] ", '<li><input type="checkbox" checked disabled> ')
    return out


def rewrite_links(body, src_dir, depth, md_to_html):
    up = "../" * depth

    def sub(m):
        href = m.group(1)
        if href.startswith(("http://", "https://", "#", "mailto:")):
            return m.group(0)
        clean, _, anchor = href.partition("#")
        anchor = ("#" + anchor) if anchor else ""
        key = os.path.normpath(os.path.join(src_dir, clean)).replace(os.sep, "/").lstrip("./")
        if key in md_to_html:
            return 'href="%s%s%s"' % (up, md_to_html[key], anchor)
        return m.group(0)

    return re.sub(r'href="([^"]+)"', sub, body)


def build_toc(body):
    items = H2_RE.findall(body)
    if len(items) < 3:
        return ""
    rows = ['<aside class="toc"><div class="tt">本頁目錄</div>']
    for hid, text in items:
        label = html.unescape(TAG_RE.sub("", text)).strip()
        rows.append('<a href="#%s">%s</a>' % (hid, html.escape(label)))
    rows.append("</aside>")
    return "".join(rows)


def build_pager(pages, idx, depth):
    up = "../" * depth
    prev_h = next_h = ""
    if idx > 0:
        rel, out_html, title, _ = pages[idx - 1]
        prev_h = ('<a href="%s%s"><div class="k">← 上一篇</div><div class="n">%s</div></a>'
                  % (up, out_html, html.escape(nav_label(rel, title))))
    if idx < len(pages) - 1:
        rel, out_html, title, _ = pages[idx + 1]
        next_h = ('<a class="next" href="%s%s"><div class="k">下一篇 →</div><div class="n">%s</div></a>'
                  % (up, out_html, html.escape(nav_label(rel, title))))
    return '<div class="pager">%s%s</div>' % (prev_h, next_h) if (prev_h or next_h) else ""


def build_index(pages):
    def cards(group):
        items = [p for p in pages if p[3] == group]
        return "".join(
            '<a class="card" href="%s"><div class="k">%s</div><div class="n">%s</div></a>'
            % (out_html, nav_label(rel, title).split(" ", 1)[0],
               html.escape(nav_label(rel, title).split(" ", 1)[-1]))
            for rel, out_html, title, _g in items)

    tech_groups = [g for g in GROUPS if g[1].startswith("tech/")]
    tech_rows = "".join(
        "<tr><td><strong>%s</strong></td><td>%d</td><td>%s</td></tr>"
        % (g[0].replace("技術 · ", ""),
           len([p for p in pages if p[3] == g[0]]),
           "、".join(nav_label(p[0], p[2]).split(" ", 1)[-1]
                     for p in pages if p[3] == g[0]))
        for g in tech_groups)

    return "\n".join([
        '<section class="hero">',
        '<span class="eyebrow">結業專題 · 規格文件</span>',
        "<h1>火鍋店點餐系統</h1>",
        "<p>中高價位、多人共鍋的台式火鍋店線上點餐系統。顧客掃桌上的 QR code 自助點餐、加點、"
        "按服務鈴，用完餐到櫃檯結帳；店家端有桌況、開桌、訂位、候位、出菜看板與防超賣的庫存扣減。</p>",
        '<div class="facts">',
        '<div class="fact"><b>5 人</b>團隊規模</div>',
        '<div class="fact"><b>6 週</b>開發時程</div>',
        '<div class="fact"><b>8 個</b>功能模組</div>',
        '<div class="fact"><b>50 頁</b>技術教學</div>',
        "</div></section>",
        '<div class="callout"><div class="h">團隊與設計稿</div>'
        "<p><strong>組員</strong>：" + "、".join(html.escape(n) for n in TEAM) + "</p>"
        '<p style="margin-top:6px"><strong>UI 設計稿</strong>：<a href="%s" target="_blank" rel="noopener">'
        "Figma・火鍋點餐系統</a>（01 Design System／02 顧客端／03 店家端）。"
        'HTML 施工架在 <a href="../ui/mockups/index.html">ui/mockups/index.html</a>，'
        "共 43 張畫面＋8 張元件總表。</p></div>" % html.escape(FIGMA_URL),
        '<div class="callout"><div class="h">先讀這一篇</div>'
        '<p><a href="spec/00-架構分層與技術選型.html">00 架構分層與技術選型</a> —— '
        "兩個定位、基礎／進階分層原則、為什麼保留 WebSocket 與排程、不建議花時間的事。"
        "接著讀 <a href=\"tech/00-技術總表.html\">技術總表</a> 的必修八頁，大約 40 分鐘。</p></div>",
        '<div class="callout pending"><div class="h">工作分配：待定</div>'
        "<p>八大模組的規格都定稿後再開會分配。方法是<strong>以功能切分</strong>——"
        "一個人負責一個功能的前後端，從資料表到畫面全部自己走一遍，"
        "而不是切成前端組／後端組。原則見 "
        '<a href="spec/05-開發流程與分工.html">05 開發流程與時程</a> §1。</p></div>',
        "<h2>規格文件</h2>",
        "<p>功能、資料、介面的定義。全員的主要依據。</p>",
        '<div class="cards">' + cards("規格文件") + "</div>",
        "<h2>模組規格</h2>",
        "<p>八大模組各一頁。每頁都有：基礎必做／延伸加分功能、會用到的技術、"
        "<strong>問題思考與解決思路</strong>、六週切分、常見卡關、驗收 demo 腳本。</p>",
        '<div class="cards">' + cards("模組規格") + "</div>",
        "<h2>UI 文件</h2>",
        "<p>畫面長什麼樣、怎麼產設計稿。</p>",
        '<div class="cards">' + cards("UI 文件") + "</div>",
        "<h2>技術教學 50 頁</h2>",
        "<p>用到的每一項技術一頁，寫給非本科背景的人看："
        "<strong>一句話 → 想像一下（零術語比喻）→ 在我們的專案裡 → 最小的例子 → "
        "15 分鐘動手小練習 → 你會遇到的坑 → 常見錯誤訊息對照 → 術語對照表 → 自我檢核 → "
        "學習資源（中文優先）</strong>。</p>",
        '<p>內文第一次出現的技術名詞（像 <span style="border-bottom:1px dashed #E8A33D">WebSocket</span>）'
        "會自動連到對應的教學頁。</p>",
        '<div class="tablewrap"><table><thead><tr><th>分類</th><th>頁數</th><th>內容</th></tr></thead>'
        "<tbody>" + tech_rows + "</tbody></table></div>",
        '<p><a href="tech/00-技術總表.html">→ 完整技術總表與必修八頁</a></p>',
        "<h2>文件維護</h2>",
        "<p>這些 HTML 是從 <code>docs/</code> 下的 Markdown 自動產生的。"
        "<strong>改文件請編輯 .md，不要直接改 HTML</strong>，改完後執行：</p>"
        "<pre><code>python3 docs/build_site.py</code></pre>"
        "<p>新增技術頁時記得更新 <code>docs/tech/glossary.json</code>，自動連結才會生效。</p>",
    ])


def main():
    pages = discover()
    md_to_html = {rel: out for rel, out, _t, _g in pages}
    md_to_html["README.md"] = "index.html"
    glossary = load_glossary()
    os.makedirs(SITE, exist_ok=True)

    # 首頁
    sb = sidebar_html(pages, 0, "index.html")
    with io.open(os.path.join(SITE, "index.html"), "w", encoding="utf-8") as f:
        f.write(page_shell("首頁", 0, "index.html", sb, build_index(pages)))

    for idx, (rel, out_html, title, _g) in enumerate(pages):
        with io.open(os.path.join(DOCS, rel), encoding="utf-8") as f:
            text = f.read()
        depth = out_html.count("/")
        body = convert(text)
        body = rewrite_links(body, os.path.dirname(rel), depth, md_to_html)
        body = autolink(body, glossary, out_html, depth)
        sb = sidebar_html(pages, depth, out_html)
        dest = os.path.join(SITE, out_html)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with io.open(dest, "w", encoding="utf-8") as f:
            f.write(page_shell(title, depth, out_html, sb, body,
                               build_toc(body), build_pager(pages, idx, depth)))

    print("完成：%d 頁（含首頁）→ docs/site/index.html" % (len(pages) + 1))
    print("術語自動連結：%d 個詞" % len(glossary))


if __name__ == "__main__":
    main()
