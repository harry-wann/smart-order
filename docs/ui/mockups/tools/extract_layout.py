#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 dist/B-inlined 的畫框在 Chromium 裡量成 layout.json，給 Figma 外掛讀。"""
import asyncio, json, glob, os, pathlib, sys
from playwright.async_api import async_playwright

SRC = sys.argv[1] if len(sys.argv) > 1 else '/tmp/dist/B'
OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp/fp/layout.json'
NAMES = sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.path.dirname(SRC) or '.', 'frames.json')

# 字型對照表放在這支腳本旁邊（以前硬寫在 /tmp，換一台機器就不見了）。
# 要換別份可以用環境變數 FONTFIX 指定。
FF_PATH = os.environ.get('FONTFIX') or os.path.join(
    os.path.dirname(os.path.abspath(__file__)), 'fontfix.css')
FF = pathlib.Path(FF_PATH).read_text(encoding='utf-8')

# 沒裝 playwright 自帶瀏覽器時，用 CHROMIUM_PATH 指到現成的 chromium
CHROMIUM = os.environ.get('CHROMIUM_PATH') or None

JS = r"""() => {
const rgb = s => {
  if (!s || s === 'none') return null;
  const m = s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
  if (!m) return null;
  const a = m[4] === undefined ? 1 : parseFloat(m[4]);
  if (a === 0) return null;
  const hex = n => ('0' + Math.round(parseFloat(n)).toString(16)).slice(-2);
  return { c: '#' + hex(m[1]) + hex(m[2]) + hex(m[3]), a: a };
};
const px = v => { const n = parseFloat(v); return isNaN(n) ? 0 : Math.round(n * 100) / 100; };

// 把 CSS 算好的呈現屬性寫進 SVG 標籤，讓它離開頁面也能獨立渲染
function svgStandalone(el, cs) {
  const c = el.cloneNode(true);
  const stroke = rgb(cs.stroke) ? rgb(cs.stroke).c : (rgb(cs.color) ? rgb(cs.color).c : '#000');
  const fill = (cs.fill === 'none' || !rgb(cs.fill)) ? 'none' : rgb(cs.fill).c;
  const r = el.getBoundingClientRect();
  c.setAttribute('width', Math.round(r.width*100)/100);
  c.setAttribute('height', Math.round(r.height*100)/100);
  c.setAttribute('stroke', stroke);
  c.setAttribute('fill', fill);
  c.setAttribute('stroke-width', String(parseFloat(cs.strokeWidth) || 1.75));
  c.setAttribute('stroke-linecap', cs.strokeLinecap || 'round');
  c.setAttribute('stroke-linejoin', cs.strokeLinejoin || 'round');
  // 內部若有 currentColor，換成實際色
  let s = c.outerHTML.replace(/currentColor/g, stroke);
  return s;
}

// box-shadow 可能有多層，逐層拆成 Figma 的 effect
function parseShadows(v) {
  if (!v || v === 'none') return [];
  const out = [];
  const parts = v.split(/,(?![^(]*\))/);
  for (const p0 of parts) {
    const p = p0.trim();
    const inset = /\binset\b/.test(p);
    const col = rgb(p);
    if (!col) continue;
    const nums = (p.replace(/rgba?\([^)]*\)/, '').match(/-?[\d.]+px/g) || []).map(px);
    if (nums.length < 2) continue;
    out.push({ i: inset ? 1 : 0, c: col.c, a: Math.round(col.a * 100) / 100,
               x: nums[0], y: nums[1], b: nums[2] || 0, s: nums[3] || 0 });
  }
  return out;
}

// 多行文字若跟 inline 元素混排，整段的 union rect 會橫跨多行，
// 拿它定位會讓兩段文字疊在一起（當初 S-02b 的說明段落就是這樣糊掉的）。
// 改成逐字量 rect.top 分行，一行輸出一個節點，之後每個節點都是單行。
function splitLines(cn) {
  const txt = cn.nodeValue;
  const rg = document.createRange();
  rg.selectNodeContents(cn);
  // getClientRects() 一行回一個 rect，直接拿它當分行依據最可靠
  const lines = [];
  const all = rg.getClientRects();
  for (let k = 0; k < all.length; k++)
    if (all[k].width > 0.5 && all[k].height > 0.5) lines.push(all[k]);
  if (!lines.length) return [];

  // 每個字歸到 top 最接近的那一行
  const buck = lines.map(function () { return { a: -1, b: -1 }; });
  for (let i = 0; i < txt.length; i++) {
    if (/\s/.test(txt[i])) continue;               // 空白不決定分行
    rg.setStart(cn, i); rg.setEnd(cn, i + 1);
    const r = rg.getBoundingClientRect();
    if (!r.height) continue;
    let best = 0, bd = Infinity;
    for (let k = 0; k < lines.length; k++) {
      const d = Math.abs(r.top - lines[k].top);
      if (d < bd) { bd = d; best = k; }
    }
    if (buck[best].a < 0) buck[best].a = i;
    buck[best].b = i + 1;
  }

  const out = [];
  for (let k = 0; k < lines.length; k++) {
    if (buck[k].a < 0) continue;
    rg.setStart(cn, buck[k].a); rg.setEnd(cn, buck[k].b);
    const r = rg.getBoundingClientRect();
    if (r.width < 0.5 || r.height < 0.5) continue;
    // 原始碼裡的換行與縮排要收斂成單一空白，否則進 Figma 會變成真的換行
    const t = txt.slice(buck[k].a, buck[k].b).replace(/\s+/g, ' ').trim();
    if (!t) continue;
    out.push({ text: t, rect: r });
  }
  return out;
}

function nameOf(el) {
  const dl = el.getAttribute && el.getAttribute('data-layer');
  if (dl) return dl;
  const cls = (typeof el.className === 'string' ? el.className : '').trim();
  if (cls) return cls.split(/\s+/).slice(0, 3).join(' ');
  return el.tagName.toLowerCase();
}

function walk(el, ox, oy) {
  const cs = getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden') return null;
  const r = el.getBoundingClientRect();
  if (el.tagName.toLowerCase() === 'svg') {
    if (r.width < 0.5 || r.height < 0.5) return null;
    return { t:'svg', n:nameOf(el), x:px(r.left-ox), y:px(r.top-oy),
             w:px(r.width), h:px(r.height), svg: svgStandalone(el, cs),
             _z: (cs.position !== 'static' && cs.zIndex !== 'auto' && cs.zIndex !== '')
                 ? (parseFloat(cs.zIndex) || 0) : 0 };
  }
  if (r.width < 0.5 || r.height < 0.5) return null;

  const bg = rgb(cs.backgroundColor);
  // 四邊分開讀。只讀 borderTopWidth 會讓 border-top 變成整圈框，
  // 而 border-bottom（表格列、頁籤底線）整個消失。
  const bws = [px(cs.borderTopWidth), px(cs.borderRightWidth),
               px(cs.borderBottomWidth), px(cs.borderLeftWidth)];
  const bcs = [rgb(cs.borderTopColor), rgb(cs.borderRightColor),
               rgb(cs.borderBottomColor), rgb(cs.borderLeftColor)];
  const bStyles = [cs.borderTopStyle, cs.borderRightStyle, cs.borderBottomStyle, cs.borderLeftStyle];
  let bIdx = bws.findIndex(w => w > 0);
  const bw = bIdx >= 0 ? bws[bIdx] : 0;
  const bc = bIdx >= 0 ? bcs[bIdx] : null;
  const rad = [cs.borderTopLeftRadius, cs.borderTopRightRadius,
               cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(px);
  const node = { t:'frame', n:nameOf(el), x:px(r.left-ox), y:px(r.top-oy),
                 w:px(r.width), h:px(r.height), ch:[] };
  // Figma 沒有 z-index，疊放順序完全看圖層先後（後面的蓋前面的）。
  // 把 CSS 的堆疊順序量下來，等一下排序用，否則像 .notify 這種
  // 「DOM 在前、z-index 拉到最上面」的元件進 Figma 會被後面的兄弟整個蓋掉。
  // 只認「明確寫了 z-index」的元素。定位但沒指定 z-index 的（appbar 的 iconbtn、
  // switch、hero…）在 CSS 裡雖然也會壓在未定位兄弟之上，但它們本來就不重疊，
  // 硬排只會把 Figma 的圖層順序打亂，看起來像亂掉。
  node._z = (cs.position !== 'static' && cs.zIndex !== 'auto' && cs.zIndex !== '')
            ? (parseFloat(cs.zIndex) || 0) : 0;
  if (bg) { node.fill = bg.c; if (bg.a < 1) node.fa = Math.round(bg.a*100)/100; }
  if (bw > 0 && bc) {
    node.st = bc.c; node.sw = bw;
    node.sd = bStyles[bIdx] === 'dashed' ? 1 : 0;
    // 四邊不一致時記下各邊寬度，外掛用 strokeTopWeight 等分別設定
    if (!(bws[0] === bws[1] && bws[1] === bws[2] && bws[2] === bws[3])) node.bw = bws;
  }
  if (rad.some(v => v > 0)) node.r = rad;
  if (cs.overflow === 'hidden' || cs.overflowX === 'hidden') node.clip = 1;
  const op = parseFloat(cs.opacity);
  if (op < 1) node.op = Math.round(op*100)/100;
  let sh = parseShadows(cs.boxShadow);
  // 設計稿有些框線是用 `box-shadow: inset 0 0 0 1.5px` 畫的（不佔版面寬度）。
  // 照搬成 Figma 的 INNER_SHADOW + spread 不會顯示，所以沒有 border 時
  // 把這種「零位移、零模糊」的內陰影改成內側描邊，其餘陰影照舊。
  if (!node.st) {
    const k = sh.findIndex(s => s.i && !s.x && !s.y && !s.b && s.s > 0);
    if (k >= 0) {
      node.st = sh[k].c; node.sw = sh[k].s; node.sd = 0;
      if (sh[k].a < 1) node.sa = sh[k].a;
      sh = sh.filter((_, j) => j !== k);
    }
  }
  if (sh.length) node.sh = sh;
  if (cs.transform && cs.transform !== 'none') {
    const m = cs.transform.match(/matrix\(([-\d.]+),\s*([-\d.]+)/);
    if (m) { const deg = Math.atan2(parseFloat(m[2]), parseFloat(m[1])) * 180 / Math.PI;
             if (Math.abs(deg) > 0.5) node.rot = Math.round(deg*100)/100; }
  }

  // 直接的文字節點 → 逐行拆開，各自量精確位置
  let sibEls = 0;
  for (const c of el.children) {
    const cr = c.getBoundingClientRect();
    if (cr.width > 0.5 && cr.height > 0.5) sibEls++;
  }
  const cx0 = px(cs.paddingLeft) + px(cs.borderLeftWidth);
  const cx1 = px(r.width) - px(cs.paddingRight) - px(cs.borderRightWidth);
  const col = rgb(cs.color);

  for (const cn of el.childNodes) {
    if (cn.nodeType === 3 && cn.nodeValue.trim()) {
      for (const seg of splitLines(cn)) {
        const tr = seg.rect;
        // 水平錨點不看 text-align：按鈕文字的 text-align 是繼承來的 start，
        // 真正讓它置中的是父層 justify-content。改看左右留白是否相等。
        // 但父層若還有其他元素（圖示、彈性空白），版面是一排東西，
        // 這時量到的位置就是真相，維持靠左釘住。
        const lgap = (tr.left - r.left) - cx0;
        const rgap = cx1 - (tr.right - r.left);
        let anchor = 'L';
        if (sibEls === 0 && Math.abs(lgap - rgap) <= 1.5 && lgap > 0.5) anchor = 'C';
        else if (rgap <= 2 && rgap < lgap - 1.5) anchor = 'R';
        node.ch.push({ t:'text', n:seg.text.slice(0,24),
          x:px(tr.left-r.left), y:px(tr.top-r.top), w:px(tr.width), h:px(tr.height),
          tx:seg.text,
          ff:cs.fontFamily.split(',')[0].replace(/['"]/g,''),
          fs:px(cs.fontSize), fw:parseInt(cs.fontWeight)||400,
          lh: cs.lineHeight==='normal' ? 0 : px(cs.lineHeight),
          ls: cs.letterSpacing==='normal' ? 0 : px(cs.letterSpacing),
          col: col ? col.c : '#000000',
          ln: 1, an: anchor, cx0: px(cx0), cx1: px(cx1),
          al: cs.textAlign
        });
      }
    } else if (cn.nodeType === 1) {
      const c = walk(cn, r.left, r.top);
      if (c) node.ch.push(c);
    }
  }
  if (node.ch.length) {
    // 穩定排序：同 z 的維持 DOM 先後，z 大的排到後面＝在 Figma 裡蓋在上面
    node.ch = node.ch
      .map(function (c, i) { return { c: c, i: i }; })
      .sort(function (a, b) { return ((a.c._z || 0) - (b.c._z || 0)) || (a.i - b.i); })
      .map(function (x) { return x.c; });
    // 排完才拿掉暫存欄位 —— 父層要先讀得到子層的 _z
    node.ch.forEach(function (c) { delete c._z; });
  } else {
    delete node.ch;
  }
  return node;
}

const out = [];
document.querySelectorAll('.frame').forEach(f => {
  const r = f.getBoundingClientRect();
  const n = walk(f, r.left, r.top);
  delete n._z;
  n.x = 0; n.y = 0;
  out.push(n);
});
return out;
}"""

PROBE_JS = """() => {
  const mk = (fam, txt) => {
    const d = document.createElement('div');
    d.style.cssText = 'position:absolute;left:-9999px;font-size:40px;font-family:' + fam;
    d.textContent = txt;
    document.body.appendChild(d);
    const r = d.getBoundingClientRect();
    d.remove();
    return Math.round(r.height / 40 * 100) / 100;
  };
  return {
    han:  mk('"Noto Sans TC"', '\u62db\u724c\u9ebb\u8fa3\u934b\u5e95'),
    num:  mk('"Noto Sans TC"', 'NT$ 1,420'),
    serif: mk('"Noto Serif TC"', '\u8a02\u4f4d\u5b8c\u6210'),
  };
}"""


async def check_fonts(pg):
    """量測前先確認字型真的有載到。

    最容易踩的坑不是「完全沒字型」，而是「中文有、數字沒有」：
    中文拿到 CJK 字型（行高 1.45em），數字掉到拉丁備援（1.15em），
    同一張稿子兩套度量混在一起，而且完全不會報錯。
    2026-09-14 那版 layout.json 就是這樣壞掉的。
    """
    await pg.set_content('<body></body>')
    await pg.add_style_tag(content=FF)
    await pg.wait_for_timeout(200)
    r = await pg.evaluate(PROBE_JS)
    bad = [k for k, v in r.items() if not (1.35 <= v <= 1.60)]
    if bad:
        sys.exit(
            '\n量測字型沒載到，中止。\n'
            '  實測行高比值：中文 %(han).2f、數字 %(num).2f、襯線 %(serif).2f\n'
            '  Noto Sans TC / Noto Serif TC 應該都落在 1.45 上下；\n'
            '  1.15 左右代表掉到系統的拉丁備援字型了。\n'
            '  跑一次 python3 tools/fetch_fonts.py 把字型裝好再來。' % r)
    if abs(r['han'] - r['num']) > 0.03:
        sys.exit('\n中文與數字用到不同字型（%.2f vs %.2f），量出來會是兩套度量。中止。'
                 % (r['han'], r['num']))
    print('字型檢查通過：中文 %.2f／數字 %.2f／襯線 %.2f' % (r['han'], r['num'], r['serif']))


async def main():
    # 畫框命名以 dist/frames.json 為準（由 figma_prep.py 產生）
    names = {}
    if os.path.exists(NAMES):
        for e in json.loads(pathlib.Path(NAMES).read_text(encoding='utf-8')):
            names[e['file']] = e
    else:
        print('警告：找不到 %s，改用 <title> 命名' % NAMES)
    files = sorted(glob.glob(os.path.join(SRC, '*.html')))
    frames = []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROMIUM) if CHROMIUM else await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 2400, 'height': 1400})
        await check_fonts(pg)
        for f in files:
            stem = os.path.basename(f)[:-5]
            await pg.goto('file://' + f)
            await pg.add_style_tag(content=FF)
            await pg.add_style_tag(content='*,*::before,*::after{animation:none!important;transition:none!important}')
            await pg.wait_for_timeout(350)
            title = await pg.title()
            nodes = await pg.evaluate(JS)
            e = names.get(stem + '.html')
            page = e['page'] if e else ('02 顧客端' if stem.startswith('c') else '03 店家端')
            labels = e['frames'] if e else None
            batch = e['batch'] if e else ''
            if labels and len(labels) != len(nodes):
                print('警告：%s 命名 %d 筆但量到 %d 個畫框' % (stem, len(labels), len(nodes)))
            for i, n in enumerate(nodes):
                if labels and i < len(labels):
                    nm = labels[i]
                elif len(nodes) == 1:
                    nm = title
                else:
                    nm = '%s #%d' % (title, i + 1)
                fr = {'name': nm, 'page': page, 'batch': batch,
                      'file': stem + '.html', 'w': n['w'], 'h': n['h'], 'root': n}
                # 右側說明卡的內容（來源 ui/13-畫框註解.md，經 figma_prep.py 進 frames.json）
                nts = (e or {}).get('notes') or []
                if i < len(nts) and nts[i]:
                    fr['note'] = nts[i]
                # 基礎必做／進階有空才做（來源 ui/10 的頁面表）
                lvs = (e or {}).get('levels') or []
                fr['level'] = lvs[i] if i < len(lvs) else '基礎'
                # 工作包（來源 spec/05 §1.4），進階與元件總表是 None
                pks = (e or {}).get('pkgs') or []
                if i < len(pks) and pks[i]:
                    fr['pkg'] = pks[i]
                # 流程分組（顧客端一條流程排一列），由 figma_prep.py 決定
                if e and 'flow' in e:
                    fr['flow'] = e['flow']
                    fr['flow_name'] = e['flow_name']
                    fr['flow_i'] = e['flow_i'] * 100 + i
                frames.append(fr)
        await b.close()
    data = {'v': 1, 'frames': frames}
    pathlib.Path(OUT).write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    def count(n):
        return 1 + sum(count(c) for c in n.get('ch', []))
    tot = sum(count(f['root']) for f in frames)
    print('畫框 %d 個，節點 %d 個，%s  %.1f MB' % (len(frames), tot, OUT, os.path.getsize(OUT)/1e6))

asyncio.run(main())
