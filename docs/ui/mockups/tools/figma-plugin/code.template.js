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
    f.strokes = [{ type: 'SOLID', color: hex(n.st), opacity: n.sa !== undefined ? n.sa : 1 }];
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
let noteMissing = 0;
let noteTallWarn = 0;
let advCount = 0;

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
  return page.children.length ? bottom + ROW_GAP : 0;
}

let TOTAL_NODES = 0;

// 完整畫框名稱清單（不分批次），用來認出「已經被刪掉的畫面」留下的舊畫框
const ALL_FRAME_NAMES = {};
DATA.frames.forEach(f => { ALL_FRAME_NAMES[f.name] = 1; });

const ROW_LABEL_PREFIX = '列標題｜';
const ROW_PLATE_PREFIX = '列底板｜';
const TITLE_PREFIX = '標題｜';
const SUB_PREFIX = '副標｜';
const NOTE_PREFIX = '說明｜';
const SHADOW_PREFIX = '陰影｜';
const LEVEL_PREFIX = '級別｜';
const ADV_PREFIX = '進階底｜';
const OWNED_PREFIX = /^(標題|副標|說明|陰影|級別|進階底)｜(.+)$/;

// ── 版面尺寸 ────────────────────────────────────────────────────────────────
// Figma 自己畫在畫框上方的那行圖層名是固定的螢幕字級，縮到看得見整列時
// 幾乎讀不出來，而且它跟畫框是綁死的、沒辦法放大。改成自己建真的文字節點，
// 這樣它跟畫框一起縮放，也能排版。
const TITLE_FS = 44;
const SUB_FS = 22;
const TITLE_H = 200;         // 畫框上方留給「標題 + 副標」的高度
// 標題 44 + 副標 30 之後還留一條 108px 的空白帶。Figma 自己畫的那行圖層名貼在畫框
// 正上方、而且是固定的螢幕字級（縮小檢視時相對變大），留這條帶子給它，
// 才不會黏在副標下面看起來像標題多了一行。

// 每個畫框右邊放一張說明卡（規格說明 / 注意事項），內容來自 ui/13-畫框註解.md。
const NOTE_W = 560;
const NOTE_PAD = 36;
const NOTE_FS = 19;
const NOTE_LH = 32;
const NOTE_GAP = 64;         // 畫框 ↔ 說明卡

const COL_GAP = 220;         // 同一列，畫面與畫面之間
const ROW_GAP = 320;         // 列與列之間
const PLATE_PAD = 96;        // 底板往外留的白邊

const UI_FAMILY = 'Noto Sans TC';
const C_INK = '#2B211C';     // text-900
const C_SUB = '#6B5D54';     // text-600
const C_SPEC = '#C8442E';    // brand-600
const C_WARN = '#B3261E';    // danger
const C_CARD = '#FFFFFF';    // surface：說明卡是一張卡片
const C_LINE = '#E6DED2';    // border
const C_MAT = '#E6DED2';     // 列底板（襯墊）
const C_ADV = '#E8A33D';     // accent-500：進階的識別色
const C_ADV_BG = '#FCF0DC';  // accent-100：進階畫面整格的底板
// 底板本來是純白。畫框底色是 #FBF7F0，跟純白只差一點點，白底板一鋪下去
// 就看不出畫框從哪裡開始、到哪裡結束。改成 --border 這個暖灰當襯墊，
// 畫框（淺）與說明卡（純白）都浮在上面，邊界自己就出來了。

// 標題、副標、說明卡用的字重。畫框內容的字體由 loadFonts() 依量測資料載，
// 這三個是外掛自己加的，要另外確保載得到。
async function loadUiFonts() {
  const want = ['Regular', 'Medium', 'Bold'];
  for (const st of want) {
    try { await figma.loadFontAsync({ family: UI_FAMILY, style: st }); }
    catch (e) { return false; }
  }
  return true;
}

// 一個字佔幾個字寬：中日韓與全形標點算 1，其餘算 0.5。
// 這是「這段字會折成幾行」的保底估算，寧可高估也不要低估（低估就會疊字）。
function widthUnits(s) {
  let u = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    const full =
      (c >= 0x1100 && c <= 0x115F) ||           // 韓文字母
      (c >= 0x2014 && c <= 0x2015) ||           // —、―
      (c >= 0x2018 && c <= 0x201D) ||           // 中文引號
      c === 0x2026 ||                           // …
      (c >= 0x2190 && c <= 0x21FF) ||           // 箭頭
      (c >= 0x2E80 && c <= 0xA4CF) ||           // 部首、注音、漢字
      (c >= 0xAC00 && c <= 0xD7A3) ||           // 韓文
      (c >= 0xF900 && c <= 0xFAFF) ||           // 相容漢字
      (c >= 0xFE30 && c <= 0xFE6F) ||           // 直排標點
      (c >= 0xFF00 && c <= 0xFF60) ||           // 全形英數與標點
      (c >= 0xFFE0 && c <= 0xFFE6);
    u += full ? 1 : 0.5;
  }
  return u;
}

// w 有給就是「固定寬、高度自己長」（會自動斷行），沒給就讓 Figma 量自己的寬度。
//
// 固定寬那條路的順序不能隨便寫：先 textAutoResize='HEIGHT' 再 resize()，
// Figma 會把 resize 傳進去的高度吃下來、不重算，折成兩行的句子高度仍然回報一行，
// 下一條註解就疊在它上面。要先 'NONE' 把寬度釘死，再切回 'HEIGHT' 逼它重算。
// t.h 是自己算的保底值，真正排版時取兩者的大的那個。
function uiText(o) {
  const t = figma.createText();
  t.fontName = { family: UI_FAMILY, style: o.bold ? 'Bold' : (o.medium ? 'Medium' : 'Regular') };
  t.fontSize = o.fs;
  const lh = o.lh || Math.round(o.fs * 1.7);
  t.lineHeight = { value: lh, unit: 'PIXELS' };
  t.characters = o.s;
  t.fills = [{ type: 'SOLID', color: hex(o.col) }];
  t.textAlignHorizontal = 'LEFT';
  if (o.w) {
    t.textAutoResize = 'NONE';
    t.resize(Math.max(o.w, 1), lh);
    t.textAutoResize = 'HEIGHT';
    const lines = Math.max(1, Math.ceil(widthUnits(o.s) * o.fs / o.w));
    t.setPluginData('estLines', String(lines));
  } else {
    t.textAutoResize = 'WIDTH_AND_HEIGHT';
  }
  return t;
}

// 取「Figma 量到的」與「自己估的」之中較大的那個
function textH(t, fs, lh) {
  const est = Number(t.getPluginData('estLines') || 1) * lh;
  return Math.max(t.height || 0, est, lh);
}

// 說明卡。沒有用 auto layout：每一條註解要先知道斷行後幾行高才排得下一條，
// 用 textAutoResize='HEIGHT' 量完直接往下疊，算出來的高度就是卡片的高度。
//
// 成品是 group 不是 frame：頂層畫框在畫布上會固定掛著自己的圖層名（而且是固定的
// 螢幕字級，縮小檢視時反而變大），一張說明卡旁邊多一行「說明｜C-04…」的灰字，
// 就是這次要拿掉的東西。group 不會畫那行字，底板矩形也是同一個理由。
function makeNotePanel(note, frameName, ox, oy, page) {
  const kids = [];
  const put = (n, dx, dy) => { page.appendChild(n); n.x = ox + dx; n.y = oy + dy; kids.push(n); };

  const bg = figma.createRectangle();
  bg.name = '卡片底';
  bg.fills = [{ type: 'SOLID', color: hex(C_CARD) }];
  bg.strokes = [{ type: 'SOLID', color: hex(C_LINE) }];
  bg.strokeAlign = 'INSIDE';
  bg.strokeWeight = 2;
  bg.cornerRadius = 20;
  bg.resize(NOTE_W, 200);
  put(bg, 0, 0);

  const inner = NOTE_W - NOTE_PAD * 2;
  const secs = [
    { h: '規格說明', items: note.spec || [], col: C_SPEC },
    { h: '注意事項', items: note.warn || [], col: C_WARN }
  ];
  let y = NOTE_PAD, wrote = 0;
  for (const sec of secs) {
    if (!sec.items.length) continue;
    if (wrote) y += 16;
    const h = uiText({ s: sec.h, fs: 26, bold: true, col: sec.col, lh: 34 });
    put(h, NOTE_PAD, y);
    y += h.height + 10;
    const rule = figma.createRectangle();
    rule.name = '分隔線';
    rule.resize(inner, 2);
    rule.fills = [{ type: 'SOLID', color: hex(C_LINE) }];
    rule.strokes = [];
    put(rule, NOTE_PAD, y);
    y += 2 + 18;
    for (const line of sec.items) {
      // 圓點與內文分開放，內文才有懸掛縮排：折到第二行時不會跑到圓點底下。
      const dot = uiText({ s: '・', fs: NOTE_FS, col: sec.col, lh: NOTE_LH });
      put(dot, NOTE_PAD, y);
      const body = uiText({ s: line, fs: NOTE_FS, w: inner - 26, col: C_INK, lh: NOTE_LH });
      put(body, NOTE_PAD + 26, y);
      y += textH(body, NOTE_FS, NOTE_LH) + 12;
    }
    wrote++;
  }
  y += NOTE_PAD - 12;
  bg.resize(NOTE_W, Math.max(y, 96));

  const g = figma.group(kids, page);
  g.name = NOTE_PREFIX + frameName;
  return g;
}

// 畫框上方的標題。第一行是代號與畫面名，第二行是尺寸、路由與狀態。
// 標題旁邊的級別膠囊。做成 group 不是 frame，理由同說明卡：頂層畫框會多一行圖層名。
function makeLevelPill(f, page, ox, oy) {
  const adv = f.level === '進階';
  const label = adv ? '進階・有空才做' : '基礎必做';
  const t = uiText({ s: label, fs: 22, bold: true,
                     col: adv ? '#6B4A12' : C_SUB, lh: 30 });
  const padX = 18, h = 40;
  const bg = figma.createRectangle();
  bg.name = '膠囊底';
  bg.resize(t.width + padX * 2, h);
  bg.fills = [{ type: 'SOLID', color: hex(adv ? C_ADV : C_MAT) }];
  bg.strokes = [];
  bg.cornerRadius = h / 2;
  page.appendChild(bg); bg.x = ox; bg.y = oy;
  page.appendChild(t); t.x = ox + padX; t.y = oy + (h - t.height) / 2;
  const g = figma.group([bg, t], page);
  g.name = LEVEL_PREFIX + f.name;
  return g;
}

// 進階畫面整格墊一張金黃虛線底板 —— 位置不動，但一眼看得出「這一格拿掉，這條線還是通的」。
// 先建（才會排在畫框底下），尺寸等整格排完再補上。
function makeAdvPlate(f, page) {
  const r = figma.createRectangle();
  r.name = ADV_PREFIX + f.name;
  r.fills = [{ type: 'SOLID', color: hex(C_ADV_BG) }];
  r.strokes = [{ type: 'SOLID', color: hex(C_ADV) }];
  r.strokeWeight = 3;
  r.strokeAlign = 'INSIDE';
  r.dashPattern = [16, 10];
  r.cornerRadius = 24;
  r.resize(1, 1);
  page.appendChild(r);
  return r;
}

// 畫框底下墊一張同尺寸、同底色、帶柔陰影的矩形。陰影不直接掛在畫框上：
// 畫框要對得起原稿，Inspect 時多一個不存在於 CSS 的效果會誤導前端。
function makeFrameShadow(f, page, ox, oy) {
  const r = figma.createRectangle();
  r.name = SHADOW_PREFIX + f.name;
  r.resize(Math.max(f.w, 1), Math.max(f.h, 1));
  r.fills = [{ type: 'SOLID', color: hex(f.root.fill || '#FBF7F0') }];
  r.strokes = [];
  r.effects = [{
    type: 'DROP_SHADOW',
    color: Object.assign(hex(C_INK), { a: 0.16 }),
    offset: { x: 0, y: 8 }, radius: 28, spread: 0,
    visible: true, blendMode: 'NORMAL'
  }];
  page.appendChild(r); r.x = ox; r.y = oy;
  return r;
}

function makeTitleNodes(f) {
  const note = f.note || null;
  const sub = Math.round(f.w) + ' × ' + Math.round(f.h) +
              (note && note.sub ? '　' + note.sub : '');
  const t1 = uiText({ s: f.name, fs: TITLE_FS, bold: true, col: C_INK, lh: 56 });
  t1.name = TITLE_PREFIX + f.name;
  const t2 = uiText({ s: sub, fs: SUB_FS, col: C_SUB, lh: 30 });
  t2.name = SUB_PREFIX + f.name;
  return [t1, t2];
}

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
const LABEL_GAP = 160;                 // 標題欄與畫框之間的留白
const LABEL_X = -(LABEL_COL + LABEL_GAP);

// 每一列底下墊一張白色底板，把整列（含左邊的列標題）框起來。
// Figma 的畫布是灰底，一整頁 40 幾個畫框散著看不出哪幾張是同一條流程；
// 墊了底板之後，一列就是一個看得見的區塊。
// 用矩形而不是畫框：頂層畫框在畫布上會固定掛著自己的圖層名，縮小檢視時
// 那行字會伸進上一列的底板底下被蓋掉，看起來像標題被切斷；矩形沒有那行字，
// 也不會在拖曳畫面經過時把畫面吃進去變成子層。
// 用 insertChild(0) 塞到整頁最底層 —— 各列在畫布上不重疊，放最底層不會蓋到任何東西。
function makeRowPlate(page, label, left, top, right, bottom) {
  const pad = PLATE_PAD;
  const f = figma.createRectangle();
  f.name = ROW_PLATE_PREFIX + label;
  f.x = left - pad;
  f.y = top - pad;
  f.resize(Math.max((right - left) + pad * 2, 1), Math.max((bottom - top) + pad * 2, 1));
  f.fills = [{ type: 'SOLID', color: hex(C_MAT) }];
  f.strokes = [];
  f.cornerRadius = 32;
  page.insertChild(0, f);
  return f;
}

async function makeRowLabel(text) {
  const t = uiText({ s: text, fs: LABEL_FS, bold: true, col: C_INK, lh: LABEL_FS + 12 });
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
  noteMissing = 0;
  noteTallWarn = 0;
  advCount = 0;
  await figma.loadAllPagesAsync();

  const picked = DATA.frames.filter(f => groups.indexOf(f.batch) >= 0 ||
    (groups.indexOf('states') >= 0 && f.batch.indexOf('states') >= 0));
  if (!picked.length) { log('沒有選到任何畫框'); figma.ui.postMessage({type:'done'}); return; }

  TOTAL_NODES = picked.reduce((a, f) => a + countNodes(f.root), 0);
  log('準備匯入 ' + picked.length + ' 個畫框、' + TOTAL_NODES + ' 個節點');

  log('載入字體…');
  if (!(await loadUiFonts())) {
    log('載不到 ' + UI_FAMILY + ' 的 Regular／Medium／Bold，標題與說明卡做不出來');
    figma.ui.postMessage({ type: 'done', error: true });
    return;
  }
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

    // 標題、副標、說明卡跟著自己的畫框走：這批要重畫的、以及畫面已經被刪掉的，才清。
    // 比對完整清單而不是這次勾選的批次，所以只跑顧客端不會誤刪店家端的。
    let oldSide = 0;
    for (const c of page.children.slice()) {
      const m = OWNED_PREFIX.exec(c.name);
      if (m && (names[m[2]] || !ALL_FRAME_NAMES[m[2]])) { c.remove(); oldSide++; }
    }
    if (oldSide) log('「' + pageName + '」清掉上一輪 ' + oldSide + ' 個標題與說明卡');

    const rows = rowsOf(list);

    // 列標題與底板只清這次會重畫的那幾列，其他列的留著
    const rowLabels = {};
    rows.forEach(r => { if (r.label) rowLabels[r.label] = 1; });
    let oldLbl = 0;
    for (const c of page.children.slice()) {
      const pre = c.name.indexOf(ROW_LABEL_PREFIX) === 0 ? ROW_LABEL_PREFIX
                : c.name.indexOf(ROW_PLATE_PREFIX) === 0 ? ROW_PLATE_PREFIX : null;
      if (pre && rowLabels[c.name.slice(pre.length)]) { c.remove(); oldLbl++; }
    }
    if (oldLbl) log('「' + pageName + '」清掉上一輪 ' + oldLbl + ' 個列標題與底板');

    let y = nextFreeY(page);

    // 顧客端每條流程排成一列（點餐／結帳／會員／預約），一眼看完整條動線。
    // 沒有 flow 的（店家端）就照舊固定每列幾張。
    for (const row of rows) {
      const rowTop = y;
      const minX = row.label ? LABEL_X : 0;
      let x = 0, rowH = 0, i = 0;

      // 一個畫面佔一格：上方標題、左邊畫框、右邊說明卡。
      for (const f of row.items) {
        // 進階底板要墊在整格最下面，所以先建
        const advPlate = f.level === '進階' ? makeAdvPlate(f, page) : null;

        const tt = makeTitleNodes(f);
        page.appendChild(tt[0]); tt[0].x = x; tt[0].y = y;
        page.appendChild(tt[1]); tt[1].x = x; tt[1].y = y + 62;   // 標題 44px 一行之後
        const pill = makeLevelPill(f, page, x + tt[0].width + 24, y + 8);
        if (f.level === '進階') advCount++;

        makeFrameShadow(f, page, x, y + TITLE_H);
        const frame = makeFrame(f.root);
        frame.name = f.name;
        page.appendChild(frame);
        frame.x = x; frame.y = y + TITLE_H;
        built++;
        for (const c of (f.root.ch || [])) {
          try { await buildInto(frame, c); }
          catch (e) { if (e.message === 'CANCELLED') { log('已取消'); figma.ui.postMessage({type:'done'}); return; } throw e; }
        }
        made.push(frame);

        let slotW = f.w, slotH = TITLE_H + f.h;
        if (f.note) {
          const panel = makeNotePanel(f.note, f.name, x + f.w + NOTE_GAP, y + TITLE_H, page);
          slotW = f.w + NOTE_GAP + NOTE_W;
          slotH = Math.max(slotH, TITLE_H + panel.height);
          if (panel.height > f.h) noteTallWarn++;
        } else {
          noteMissing++;
        }

        if (advPlate) {
          // 整格（標題、膠囊、畫框、說明卡）往外留 40px
          const pad = 40;
          const right = Math.max(x + slotW, pill.x + pill.width);
          advPlate.x = x - pad;
          advPlate.y = y - pad;
          advPlate.resize(Math.max(right - x + pad * 2, 1),
                          Math.max(slotH + pad * 2, 1));
        }

        rowH = Math.max(rowH, slotH);
        i++;
        if (row.perRow && i % row.perRow === 0) { x = 0; y += rowH + ROW_GAP; rowH = 0; }
        else { x += slotW + COL_GAP; }
        progress(built, TOTAL_NODES, f.name);
        await new Promise(r => setTimeout(r, 0));
      }

      const rowBottom = y + rowH;
      const rowRight = x - COL_GAP;   // 迴圈最後多加了一次 COL_GAP，扣回來就是最後一格的右緣

      // 列標題放在左側邊界外、對齊整列的垂直中線（含標題與說明卡的高度）。
      if (row.label) {
        const lbl = await makeRowLabel(row.label);
        if (lbl) {
          lbl.x = LABEL_X;                       // 每一列都從同一個 x 起算，統一靠左
          lbl.y = rowTop + (rowH - lbl.height) / 2;
          page.appendChild(lbl);
          if (lbl.width > LABEL_COL) log('列標題「' + row.label + '」比標題欄寬，會吃到留白');
        }
        makeRowPlate(page, row.label, minX, rowTop, rowRight, rowBottom);
      }
      y = rowBottom + ROW_GAP;
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
  if (noteMissing) log('提醒：' + noteMissing + ' 個畫框沒有註解，右邊是空的（補在 ui/13-畫框註解.md）');
  if (noteTallWarn) log('提醒：' + noteTallWarn + ' 張說明卡比畫框還高，那幾則寫太長了');
  log('其中 ' + advCount + ' 張標成「進階・有空才做」，整格墊了金黃底板');
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
