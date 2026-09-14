// ─────────────────────────────────────────────────────────────────────────────
// 火鍋點餐系統 — 設計稿匯入外掛
//
// 資料（const DATA）由 build_plugin.py 注入在這個檔案最前面，
// 來源是 tools/extract_layout.py 在 Chromium 裡量出來的 layout.json。
// 不要手改 code.js，改 code.template.js 之後重跑 build_plugin.py。
// ─────────────────────────────────────────────────────────────────────────────

const WEIGHT = { 400: 'Regular', 500: 'Medium', 700: 'Bold', 900: 'Black' };
const ALIGN = { left: 'LEFT', center: 'CENTER', right: 'RIGHT',
                start: 'LEFT', end: 'RIGHT', justify: 'JUSTIFIED' };

const fontOk = {};          // "family|style" → 實際可用的 style
let cancelled = false;

function hex(h) {
  return { r: parseInt(h.slice(1, 3), 16) / 255,
           g: parseInt(h.slice(3, 5), 16) / 255,
           b: parseInt(h.slice(5, 7), 16) / 255 };
}

function log(msg) { figma.ui.postMessage({ type: 'log', msg: msg }); }
function progress(done, total, label) {
  figma.ui.postMessage({ type: 'progress', done: done, total: total, label: label });
}

// ── 字體 ────────────────────────────────────────────────────────────────────
function neededFonts() {
  const want = new Set();
  const scan = n => {
    if (n.t === 'text') want.add(n.ff + '|' + (WEIGHT[n.fw] || 'Regular'));
    (n.ch || []).forEach(scan);
  };
  DATA.frames.forEach(f => scan(f.root));
  return [...want];
}

async function loadFonts() {
  const missing = [];
  for (const key of neededFonts()) {
    const parts = key.split('|');
    const family = parts[0], style = parts[1];
    try {
      await figma.loadFontAsync({ family: family, style: style });
      fontOk[key] = style;
    } catch (e) {
      try {
        await figma.loadFontAsync({ family: family, style: 'Regular' });
        fontOk[key] = 'Regular';
        log('字重缺 ' + key + '，退回 Regular');
      } catch (e2) {
        fontOk[key] = null;
        missing.push(key);
      }
    }
  }
  return missing;
}

// ── 建節點 ──────────────────────────────────────────────────────────────────
function makeFrame(n) {
  const f = figma.createFrame();
  f.name = n.n || 'frame';
  f.resizeWithoutConstraints(Math.max(n.w, 0.01), Math.max(n.h, 0.01));
  f.x = n.x; f.y = n.y;
  f.fills = n.fill
    ? [{ type: 'SOLID', color: hex(n.fill), opacity: n.fa === undefined ? 1 : n.fa }]
    : [];
  if (n.st) {
    f.strokes = [{ type: 'SOLID', color: hex(n.st) }];
    f.strokeAlign = 'INSIDE';              // CSS border 是 border-box，對應 INSIDE
    if (n.sd) f.dashPattern = [4, 4];
    if (n.bw) {
      // 四邊寬度不一致（border-top / border-bottom 這種單邊框線）
      f.strokeTopWeight = n.bw[0];
      f.strokeRightWeight = n.bw[1];
      f.strokeBottomWeight = n.bw[2];
      f.strokeLeftWeight = n.bw[3];
    } else {
      f.strokeWeight = Math.max(n.sw, 0.01);
    }
  } else {
    f.strokes = [];
  }
  if (n.r) {
    f.topLeftRadius = n.r[0]; f.topRightRadius = n.r[1];
    f.bottomRightRadius = n.r[2]; f.bottomLeftRadius = n.r[3];
  }
  f.clipsContent = !!n.clip;               // Figma 預設 true，一定要明寫
  if (n.op !== undefined) f.opacity = n.op;
  if (n.rot) f.rotation = -n.rot;          // CSS 正角是順時針，Figma 正角是逆時針
  if (n.sh) {
    f.effects = n.sh.map(s => ({
      type: s.i ? 'INNER_SHADOW' : 'DROP_SHADOW',
      color: Object.assign(hex(s.c), { a: s.a }),
      offset: { x: s.x, y: s.y },
      radius: s.b, spread: s.s,
      visible: true, blendMode: 'NORMAL'
    }));
  }
  return f;
}

function makeText(n) {
  const style = WEIGHT[n.fw] || 'Regular';
  const key = n.ff + '|' + style;
  const use = fontOk[key];
  if (!use) return null;
  const t = figma.createText();
  t.fontName = { family: n.ff, style: use };
  t.fontSize = Math.max(n.fs, 1);
  if (n.lh) t.lineHeight = { value: n.lh, unit: 'PIXELS' };
  if (n.ls) t.letterSpacing = { value: n.ls, unit: 'PIXELS' };
  t.characters = n.tx;
  t.fills = [{ type: 'SOLID', color: hex(n.col) }];

  // 抽取器每個文字節點都已經拆成單行，所以先讓 Figma 自己決定寬度，
  // 不給它換行的機會（硬塞量測寬度會讓「NT$ 1,562」斷成兩行、
  // 「18:00」斷行後被畫框裁成「18:0」）。
  t.textAutoResize = 'WIDTH_AND_HEIGHT';
  const w = t.width + 1;          // 多留 1px，免得等一下鎖寬時又被擠到換行

  // 垂直位置不能只把框頂對到量到的 top。瀏覽器量到的是字的內容盒
  // （ascent + descent），Figma 的框高卻是行高，兩個高度不一樣，
  // 字就會整排浮上去或沉下來 —— 按鈕文字、輸入框 placeholder 都是這樣歪的。
  // 改成把框高鎖成量到的高度、讓字在框內垂直置中，
  // 這樣不管 Figma 那邊字體度量或行高怎麼算，字的中線都會落在量到的中線上。
  t.textAutoResize = 'NONE';
  t.resize(Math.max(w, 0.01), Math.max(n.h, 0.01));
  t.textAlignVertical = 'CENTER';

  // 錨點來自抽取器算出的「左右留白是否相等」，不是 CSS text-align。
  // 按鈕文字的 text-align 是繼承來的 start，真正讓它置中的是父層
  // justify-content —— 只看 text-align 會把置中的字釘在左邊，
  // Figma 的字比較寬就往右長，看起來整個沒置中。
  const an = n.an || 'L';
  if (an === 'C') { t.x = n.cx0 + (n.cx1 - n.cx0 - w) / 2; t.textAlignHorizontal = 'CENTER'; }
  else if (an === 'R') { t.x = n.cx1 - w; t.textAlignHorizontal = 'RIGHT'; }
  else { t.x = n.x; t.textAlignHorizontal = 'LEFT'; }
  t.y = n.y;
  t.name = n.n || n.tx.slice(0, 20);
  return t;
}

function makeSvg(n) {
  let node;
  try { node = figma.createNodeFromSvg(n.svg); }
  catch (e) { log('SVG 解析失敗：' + (n.n || '')); return null; }
  node.name = n.n || 'icon';
  // 不呼叫 resize：createNodeFromSvg 回傳的是 frame，resize 只會改框不會縮放裡面的向量。
  // SVG 標籤上已經帶了算好的 width/height，尺寸本來就該是對的。
  if (Math.abs(node.width - n.w) > 1 || Math.abs(node.height - n.h) > 1) {
    svgSizeWarn++;
  }
  node.x = n.x; node.y = n.y;
  return node;
}

let built = 0;
let svgSizeWarn = 0;

async function buildInto(parent, n) {
  let node;
  if (n.t === 'text') node = makeText(n);
  else if (n.t === 'svg') node = makeSvg(n);
  else node = makeFrame(n);
  if (!node) return;
  parent.appendChild(node);
  built++;
  if (built % 300 === 0) {
    progress(built, TOTAL_NODES, '建立節點');
    await new Promise(r => setTimeout(r, 0));   // 讓 UI 有機會更新
    if (cancelled) throw new Error('CANCELLED');
  }
  for (const c of (n.ch || [])) {
    if (n.t === 'frame') await buildInto(node, c);
  }
}

// ── 頁面 ────────────────────────────────────────────────────────────────────
function findPage(name) {
  const key = name.replace(/^\d+\s*/, '').trim();     // 「02 顧客端」→「顧客端」
  let p = figma.root.children.find(x => x.name.trim() === name.trim());
  if (!p) p = figma.root.children.find(x => x.name.indexOf(key) >= 0);
  return p || null;
}

function nextFreeY(page) {
  let bottom = 0;
  for (const c of page.children) bottom = Math.max(bottom, c.y + c.height);
  return page.children.length ? bottom + 200 : 0;
}

let TOTAL_NODES = 0;

// 完整畫框名稱清單（不分批次），用來認出「已經被刪掉的畫面」留下的舊畫框
const ALL_FRAME_NAMES = {};
DATA.frames.forEach(f => { ALL_FRAME_NAMES[f.name] = 1; });

const ROW_LABEL_PREFIX = '列標題｜';
const ROW_PLATE_PREFIX = '列底板｜';

// 把一頁的畫框切成「一列一條流程」。有 flow 的照流程分列並掛上標題，
// 沒有的（店家端）就維持原本的固定列寬。
function rowsOf(list) {
  const hasFlow = list.some(f => f.flow !== undefined);
  if (!hasFlow) return [{ label: null, perRow: list[0].w > 800 ? 3 : 7, items: list }];
  const byFlow = {};
  list.forEach(f => {
    const k = f.flow === undefined ? 999 : f.flow;
    (byFlow[k] = byFlow[k] || { name: f.flow_name || '其他', items: [] }).items.push(f);
  });
  return Object.keys(byFlow)
    .sort((a, b) => Number(a) - Number(b))
    .map(k => {
      const g = byFlow[k];
      g.items.sort((a, b) => (a.flow_i || 0) - (b.flow_i || 0));
      return { label: g.name, perRow: 0, items: g.items };
    });
}

// 列標題統一靠左：固定一個標題欄，每一列的標題都從同一個 x 起算。
// 原本是把標題靠右貼齊畫框左緣，字數不同的列（「點餐」對「狀態與店家端」）
// 起點就差了好幾百 px，整頁看起來像沒對齊；底板左緣也跟著參差。
const LABEL_FS = 72;
const LABEL_COL = LABEL_FS * 6;        // 目前最長的流程名「狀態與店家端」是 6 個字
const LABEL_GAP = 120;                 // 標題欄與畫框之間的留白
const LABEL_X = -(LABEL_COL + LABEL_GAP);

// 每一列底下墊一張白色底板，把整列（含左邊的列標題）框起來。
// Figma 的畫布是灰底，一整頁 40 幾個畫框散著看不出哪幾張是同一條流程；
// 墊了底板之後，一列就是一個看得見的區塊。
// 用矩形而不是畫框：頂層畫框在畫布上會固定掛著自己的圖層名，縮小檢視時
// 那行字會伸進上一列的底板底下被蓋掉，看起來像標題被切斷；矩形沒有那行字，
// 也不會在拖曳畫面經過時把畫面吃進去變成子層。
// 用 insertChild(0) 塞到整頁最底層 —— 各列在畫布上不重疊，放最底層不會蓋到任何東西。
function makeRowPlate(page, label, left, top, right, bottom) {
  const pad = 64;
  const f = figma.createRectangle();
  f.name = ROW_PLATE_PREFIX + label;
  f.x = left - pad;
  f.y = top - pad;
  f.resize(Math.max((right - left) + pad * 2, 1), Math.max((bottom - top) + pad * 2, 1));
  f.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  f.strokes = [];
  f.cornerRadius = 24;
  page.insertChild(0, f);
  return f;
}

async function makeRowLabel(text) {
  const family = 'Noto Sans TC', style = 'Bold';
  try { await figma.loadFontAsync({ family: family, style: style }); }
  catch (e) { return null; }
  const t = figma.createText();
  t.fontName = { family: family, style: style };
  t.fontSize = LABEL_FS;
  t.characters = text;
  t.fills = [{ type: 'SOLID', color: hex('#2B211C') }];
  t.textAutoResize = 'WIDTH_AND_HEIGHT';
  t.name = ROW_LABEL_PREFIX + text;
  return t;
}

function countNodes(n) {
  return 1 + (n.ch || []).reduce((a, c) => a + countNodes(c), 0);
}

async function run(groups) {
  cancelled = false;
  built = 0;
  svgSizeWarn = 0;
  await figma.loadAllPagesAsync();

  const picked = DATA.frames.filter(f => groups.indexOf(f.batch) >= 0 ||
    (groups.indexOf('states') >= 0 && f.batch.indexOf('states') >= 0));
  if (!picked.length) { log('沒有選到任何畫框'); figma.ui.postMessage({type:'done'}); return; }

  TOTAL_NODES = picked.reduce((a, f) => a + countNodes(f.root), 0);
  log('準備匯入 ' + picked.length + ' 個畫框、' + TOTAL_NODES + ' 個節點');

  log('載入字體…');
  const missing = await loadFonts();
  if (missing.length) {
    log('字體缺失，停止：' + missing.join('、'));
    log('請確認 Figma 有 Noto Sans TC 與 Noto Serif TC');
    figma.ui.postMessage({ type: 'done', error: true });
    return;
  }

  // 依目標頁分組
  const byPage = {};
  picked.forEach(f => { (byPage[f.page] = byPage[f.page] || []).push(f); });

  const made = [];
  for (const pageName of Object.keys(byPage)) {
    const page = findPage(pageName);
    if (!page) { log('找不到頁面「' + pageName + '」，這批跳過'); continue; }
    const list = byPage[pageName];

    // 重跑時先清掉上一輪的同名畫框，讓匯入可以重複執行，不必每次手動全選刪除。
    // 只刪名字對得上的，頁面上其他東西一律不碰。
    const names = {};
    list.forEach(f => { names[f.name] = 1; });
    let removed = 0;
    for (const c of page.children.slice()) {
      if (names[c.name]) { c.remove(); removed++; }
    }
    if (removed) log('「' + pageName + '」清掉上一輪 ' + removed + ' 個同名畫框');

    // 畫面被刪掉時（例如 C-02b 隨開桌碼功能移除），上一輪留下的畫框不會有人來蓋掉，
    // 會一直留在頁面上變成幽靈。把「長得像我們產的、但已經不在清單裡」的清掉。
    // 比對的是完整清單而不是這次勾選的批次，所以只跑顧客端不會誤刪店家端的。
    let orphan = 0;
    for (const c of page.children.slice()) {
      if (!ALL_FRAME_NAMES[c.name] && /^(?:DS|[CS])-\d+[a-z]?｜/.test(c.name)) {
        log('「' + pageName + '」移除已刪除的畫面：' + c.name);
        c.remove(); orphan++;
      }
    }
    if (orphan) log('「' + pageName + '」共移除 ' + orphan + ' 個已不在清單內的畫框');

    // 上一輪的列標題也要清掉，否則重跑會愈疊愈多
    let oldLbl = 0;
    for (const c of page.children.slice()) {
      if ((c.type === 'TEXT' && c.name.indexOf(ROW_LABEL_PREFIX) === 0) ||
          c.name.indexOf(ROW_PLATE_PREFIX) === 0) { c.remove(); oldLbl++; }
    }
    if (oldLbl) log('「' + pageName + '」清掉上一輪 ' + oldLbl + ' 個列標題與底板');

    const gap = 100;
    let y = nextFreeY(page);

    // 顧客端每條流程排成一列（點餐／結帳／會員／預約），一眼看完整條動線。
    // 沒有 flow 的（店家端）就照舊固定每列幾張。
    for (const row of rowsOf(list)) {
      const rowTop = y;
      let minX = 0;

      // 列標題放在左側邊界外、對齊整列的垂直中線。
      // 放在畫框正上方會跟 Figma 自己畫的畫框名稱疊在一起（縮小時特別明顯）。
      if (row.label) {
        const lbl = await makeRowLabel(row.label);
        if (lbl) {
          const h = row.items.reduce((m, f) => Math.max(m, f.h), 0);
          lbl.x = LABEL_X;                       // 每一列都從同一個 x 起算，統一靠左
          lbl.y = y + (h - lbl.height) / 2;
          page.appendChild(lbl);
          minX = Math.min(minX, LABEL_X);
          if (lbl.width > LABEL_COL) log('列標題「' + row.label + '」比標題欄寬，會吃到留白');
        }
      }
      let x = 0, rowH = 0, i = 0;
      for (const f of row.items) {
        const frame = makeFrame(f.root);
        frame.name = f.name;
        frame.x = x; frame.y = y;
        page.appendChild(frame);
        built++;
        for (const c of (f.root.ch || [])) {
          try { await buildInto(frame, c); }
          catch (e) { if (e.message === 'CANCELLED') { log('已取消'); figma.ui.postMessage({type:'done'}); return; } throw e; }
        }
        made.push(frame);
        rowH = Math.max(rowH, f.h);
        i++;
        if (row.perRow && i % row.perRow === 0) { x = 0; y += rowH + gap; rowH = 0; }
        else { x += f.w + gap; }
        progress(built, TOTAL_NODES, f.name);
        await new Promise(r => setTimeout(r, 0));
      }
      const rowBottom = y + rowH;
      const rowRight = x - gap;   // 迴圈最後多加了一次 gap，扣回來就是最後一張的右緣
      if (row.label) makeRowPlate(page, row.label, minX, rowTop, rowRight, rowBottom);
      y = rowBottom + (row.label ? 200 : gap);
    }
    log('「' + pageName + '」完成 ' + list.length + ' 個畫框');
  }

  if (made.length) {
    const page = made[0].parent;
    // documentAccess:"dynamic-page" 之下不能直接指派 figma.currentPage
    if (page && page.type === 'PAGE') {
      try { await figma.setCurrentPageAsync(page); }
      catch (e) { log('切換頁面失敗（不影響已建立的畫框）：' + e.message); }
    }
    try {
      const sel = made.filter(m => m.parent === figma.currentPage);
      figma.currentPage.selection = sel;
      if (sel.length) figma.viewport.scrollAndZoomIntoView(sel);
    } catch (e) {
      log('選取／縮放失敗（不影響已建立的畫框）：' + e.message);
    }
  }
  if (svgSizeWarn) log('提醒：' + svgSizeWarn + ' 個圖示的尺寸與量測值差超過 1px');
  log('全部完成，共 ' + made.length + ' 個畫框、' + built + ' 個節點');
  figma.ui.postMessage({ type: 'done' });
}

// ── 放大檢視 ────────────────────────────────────────────────────────────────
// 匯入後要看某個元件長怎樣時用這個：用文字找到節點，選取它的父層（通常是
// 按鈕或輸入框那層）再把畫布縮放過去。背景自動化沒辦法在 Figma 畫布上點選，
// 所以檢查動作得由外掛自己完成。
async function focusOn(q) {
  await figma.loadAllPagesAsync();
  for (const page of figma.root.children) {
    if (page.type !== 'PAGE') continue;
    const hits = [];
    const scan = n => {
      if (n.type === 'TEXT' && n.characters && n.characters.indexOf(q) >= 0) hits.push(n);
      if (n.children) n.children.forEach(scan);
    };
    page.children.forEach(scan);
    if (!hits.length) continue;
    const t = hits[0];
    const target = (t.parent && t.parent.type !== 'PAGE') ? t.parent : t;
    await figma.setCurrentPageAsync(page);
    figma.currentPage.selection = [target];
    figma.viewport.scrollAndZoomIntoView([target]);
    log('放大檢視「' + q + '」→ ' + page.name + ' / ' + target.name +
        '（同頁共 ' + hits.length + ' 處，顯示第 1 處）');
    return;
  }
  log('找不到含有「' + q + '」的文字');
}

// ── 啟動 ────────────────────────────────────────────────────────────────────
figma.showUI(__html__, { width: 380, height: 600 });

figma.ui.onmessage = async msg => {
  if (msg.type === 'run') {
    try { await run(msg.groups); }
    catch (e) { log('錯誤：' + e.message); figma.ui.postMessage({ type: 'done', error: true }); }
  } else if (msg.type === 'focus') {
    try { await focusOn(msg.q); }
    catch (e) { log('放大檢視失敗：' + e.message); }
  } else if (msg.type === 'cancel') {
    cancelled = true;
  } else if (msg.type === 'close') {
    figma.closePlugin();
  }
};

// 開啟時先回報有哪些畫框、以及頁面對不對得上
figma.loadAllPagesAsync().then(() => {
  const groups = {};
  DATA.frames.forEach(f => { groups[f.batch] = (groups[f.batch] || 0) + 1; });
  const pages = {};
  DATA.frames.forEach(f => { pages[f.page] = !!findPage(f.page); });
  figma.ui.postMessage({ type: 'init', groups: groups, pages: pages,
                         total: DATA.frames.length });
});
