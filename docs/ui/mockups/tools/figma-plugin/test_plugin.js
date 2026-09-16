// 用假的 Figma API 在 Node 裡實跑一次 code.js，確認節點都建得出來、沒有 NaN 座標。
//
//   node test_plugin.js code.js
//
// 真的丟進 Figma 之前先跑這支。它會檢查：
//   - 全部畫框有沒有都建出來、分到正確的 page
//   - 再跑第二次：畫框要沿用同一個節點（id 不變），其他東西不能重複
//   - 基礎畫面有工作包標籤與色條，進階與元件總表沒有
//   - 有沒有 NaN 座標（量測資料壞掉時會出現）
//   - 畫框名有沒有重複、有沒有尺寸為 0 的
//   - 需要的字體有沒有被 loadFontAsync 載到
//
// 注意：createNodeFromSvg 這裡是假的、回傳 0×0 的節點，
// 所以「圖示尺寸與量測值差超過 1px」那條提醒是測試環境的產物，不是真的問題。
const fs = require('fs');
const path = require('path').resolve(process.argv[2] || 'code.js');

let created = { FRAME:0, TEXT:0, RECTANGLE:0, SVG:0, GROUP:0 };
let nextId = 1;
let nanHits = [], fontsLoaded = new Set(), msgs = [];

function node(type){
  const n = {
    type, id: String(nextId++), name:'', children:[], parent:null,
    x:0, y:0, width:0, height:0, characters:'',
    fills:[], strokes:[], effects:[], opacity:1,
    appendChild(c){ if (c.parent) c.parent.children = c.parent.children.filter(x=>x!==c); c.parent = this; this.children.push(c); },
    insertChild(i,c){ if (c.parent) c.parent.children = c.parent.children.filter(x=>x!==c); c.parent = this; this.children.splice(i,0,c); },
    resize(w,h){
      if (!isFinite(w) || !isFinite(h)) nanHits.push(`resize ${this.name} ${w}x${h}`);
      this.width=w; this.height=h;
    },
    resizeWithoutConstraints(w,h){ this.resize(w,h); },
    remove(){ if(this.parent) this.parent.children = this.parent.children.filter(x=>x!==this); },
    findAll(fn){ const out=[]; const walk=(n)=>{ n.children.forEach(c=>{ if(!fn||fn(c)) out.push(c); walk(c); }); }; walk(this); return out; },
    setRangeFontName(){}, setRangeFills(){}, insertCharacters(){},
    _pd:{}, setPluginData(k,v){ this._pd[k]=v; }, getPluginData(k){ return this._pd[k]||''; },
    clone(){ return node(type); },
  };
  Object.defineProperty(n, 'x', { get(){ return n._x||0 }, set(v){ if(!isFinite(v)) nanHits.push(`x ${n.name} ${v}`); n._x=v } });
  Object.defineProperty(n, 'y', { get(){ return n._y||0 }, set(v){ if(!isFinite(v)) nanHits.push(`y ${n.name} ${v}`); n._y=v } });
  created[type==='FRAME'?'FRAME':type==='TEXT'?'TEXT':type==='RECTANGLE'?'RECTANGLE':type==='GROUP'?'GROUP':'SVG']++;
  return n;
}

const pages = ['01 Design System','02 顧客端','03 店家端'].map(nm=>{ const p=node('PAGE'); p.name=nm; return p; });
// PAGE 也要有 insertChild / appendChild（node() 已經給了），另外補 selection
pages.forEach(p=>{ p.selection = []; });

global.figma = {
  root: { children: pages },
  currentPage: pages[0],
  createFrame:()=>node('FRAME'),
  createText:()=>node('TEXT'),
  createRectangle:()=>node('RECTANGLE'),
  createNodeFromSvg:()=>node('SVGNODE'),
  // group：把已經在 page 上的節點收成一個群組，取代它們在 page 上的位置
  group:(nodes, parent)=>{
    const g = node('GROUP');
    let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
    nodes.forEach(n=>{
      parent.children = parent.children.filter(c=>c!==n);
      g.appendChild(n);
      x0=Math.min(x0,n.x); y0=Math.min(y0,n.y);
      x1=Math.max(x1,n.x+n.width); y1=Math.max(y1,n.y+n.height);
    });
    parent.appendChild(g);
    g._x=x0; g._y=y0; g.width=x1-x0; g.height=y1-y0;
    return g;
  },
  loadFontAsync:async(f)=>{ fontsLoaded.add(f.family+' '+f.style); },
  loadAllPagesAsync:async()=>{},
  setCurrentPageAsync:async(p)=>{ figma.currentPage=p; },
  viewport:{ scrollAndZoomIntoView(){} },
  showUI(){}, closePlugin(){},
  ui:{ postMessage:(m)=>msgs.push(m), onmessage:null },
  mixed: Symbol('mixed'),
};
global.__html__ = '';

require(path);
const DATA_FRAMES = (() => {
  const src = fs.readFileSync(path, 'utf8');
  const i = src.indexOf('const DATA = ');
  const j = src.indexOf(';\n', i);
  return JSON.parse(src.slice(i + 13, j)).frames;
})();

(async () => {
  // 模擬使用者在外掛 UI 按下「開始匯入」，勾選全部群組
  const groups = ['00-design-system','01-customer-375','03-admin-1280','04-admin-1920','05-states-375','06-states-1280'];
  await figma.ui.onmessage({ type:'run', groups });
  await new Promise(r=>setTimeout(r,200));
  // 第二次匯入：畫框要沿用同一個節點（id 不變），頂層節點數要跟第一次一樣
  const firstIds = {}; const firstTop = pages.map(p=>p.children.length);
  pages.forEach(p=>p.children.forEach(c=>{ if (c.type==='FRAME' && c.name.indexOf('說明｜')!==0) firstIds[c.name]=c.id; }));
  await figma.ui.onmessage({ type:'run', groups });
  await new Promise(r=>setTimeout(r,200));
  const idChanged = []; pages.forEach(p=>p.children.forEach(c=>{ if (firstIds[c.name] && firstIds[c.name]!==c.id) idChanged.push(c.name); }));
  const topNow = pages.map(p=>p.children.length);
  console.log('重跑後畫框 id 改變：', idChanged.length ? idChanged.slice(0,5).join(', ')+'…共'+idChanged.length : '無');
  console.log('重跑前後頂層節點數：', firstTop.join('/'), '→', topNow.join('/'), firstTop.join()===topNow.join() ? '✓' : '✗ 有東西重複或遺失');
  // 頂層的畫框有兩種：畫面本身，以及掛在它右邊的說明卡。下面的檢查只算畫面。
  const isScreen = c => c.type==='FRAME' && c.name.indexOf('說明｜')!==0;
  const frames = pages.flatMap(p=>p.children.filter(isScreen));
  console.log('── 假 Figma 實跑結果 ──────────────────────');
  console.log('建立節點：', JSON.stringify(created));
  console.log('頂層畫面：', frames.length);
  pages.forEach(p=>console.log('   %s  %d 個畫面', p.name.padEnd(18), p.children.filter(isScreen).length));
  console.log('載入字體：', [...fontsLoaded].sort().join(' / '));
  console.log('NaN 座標：', nanHits.length, nanHits.slice(0,5).join(' | '));
  const dup = {}; frames.forEach(f=>dup[f.name]=(dup[f.name]||0)+1);
  const dups = Object.entries(dup).filter(([,c])=>c>1);
  console.log('重複畫框名：', dups.length ? dups.map(d=>d[0]+'×'+d[1]).join(', ') : '無');
  const zero = frames.filter(f=>!f.width||!f.height);
  console.log('尺寸為 0 的畫框：', zero.length ? zero.map(f=>f.name).join(', ') : '無');

  // 每個畫框都要有自己的標題、副標與說明卡，而且說明卡不能是空的
  const top = pages.flatMap(p=>p.children);
  const pick = pre => new Set(top.filter(c=>c.name.indexOf(pre)===0).map(c=>c.name.slice(pre.length)));
  const titles = pick('標題｜'), subs = pick('副標｜'), notes = pick('說明｜'),
        shadows = pick('陰影｜'), pills = pick('級別｜'), advs = pick('進階底｜');
  const miss = frames.map(f=>f.name).filter(n=>!titles.has(n)||!subs.has(n)||!notes.has(n)
                                                ||!shadows.has(n)||!pills.has(n));
  console.log('缺標題／副標／說明卡／襯底／級別：', miss.length ? miss.join(', ') : '無');
  // 進階底板只該出現在 layout.json 標成進階的那幾張
  const wantAdv = new Set(DATA_FRAMES.filter(f=>f.level==='進階').map(f=>f.name));
  const gotAdv = [...advs];
  const advBad = [...new Set([...gotAdv.filter(n=>!wantAdv.has(n)).map(n=>'多了 '+n),
                              ...[...wantAdv].filter(n=>!advs.has(n)).map(n=>'少了 '+n)])];
  console.log('進階底板：', gotAdv.length + ' 張（' + [...wantAdv].join('、') + '）',
              advBad.length ? '✗ ' + advBad.join(', ') : '✓');
  // 襯底要跟畫框同尺寸、同位置，而且必須排在畫框下面
  const badPad = [];
  for (const pg of pages) {
    const idx = {}; pg.children.forEach((c,i)=>{ idx[c.name]=i; });
    for (const f of pg.children.filter(isScreen)) {
      const sh = pg.children.find(c=>c.name==='陰影｜'+f.name);
      if (!sh) continue;
      if (sh.x!==f.x || sh.y!==f.y || sh.width!==f.width || sh.height!==f.height) badPad.push(f.name+'（位置或尺寸不合）');
      else if (idx['陰影｜'+f.name] > idx[f.name]) badPad.push(f.name+'（蓋在畫框上面）');
    }
  }
  console.log('襯底陰影對不上：', badPad.length ? badPad.join(', ') : '無');
  // 工作包：有 pkg 的畫框要有標籤與色條，沒有的不能有
  const tags = pick('工作包｜'), bars = pick('工作包色條｜');
  const wantPkg = new Set(DATA_FRAMES.filter(f=>f.pkg).map(f=>f.name));
  const pkgBad = [...[...wantPkg].filter(n=>!tags.has(n)||!bars.has(n)).map(n=>'少了 '+n),
                  ...[...tags].filter(n=>!wantPkg.has(n)).map(n=>'多了 '+n)];
  const legends = top.filter(c=>c.name.indexOf('工作包圖例｜')===0).map(c=>c.name);
  console.log('工作包標籤與色條：', wantPkg.size + ' 張', pkgBad.length ? '✗ ' + pkgBad.slice(0,5).join(', ') : '✓',
              '　圖例：' + legends.join('、'));
  const stray = [...titles,...subs,...notes,...shadows,...pills,...advs].filter(n=>!frames.some(f=>f.name===n));
  // 標題／說明卡不能蓋到畫面：兩兩檢查同一頁上的方框有沒有重疊
  let overlap = [];
  for (const pg of pages) {
    const boxes = pg.children.filter(c=>c.type!=='RECTANGLE')
      .map(c=>({n:c.name, x1:c.x, y1:c.y, x2:c.x+c.width, y2:c.y+c.height}));
    for (let a=0;a<boxes.length;a++) for (let b=a+1;b<boxes.length;b++) {
      const A=boxes[a],B=boxes[b];
      if (A.x1<B.x2-0.5 && B.x1<A.x2-0.5 && A.y1<B.y2-0.5 && B.y1<A.y2-0.5)
        overlap.push(A.n+' ↔ '+B.n);
    }
  }
  console.log('版面重疊：', overlap.length ? overlap.slice(0,6).join(' / ')+(overlap.length>6?' …共'+overlap.length+'處':'') : '無');
  console.log('沒有對應畫框的標題或說明卡：', stray.length ? [...new Set(stray)].join(', ') : '無');
  const panels = top.filter(c=>c.name.indexOf('說明｜')===0);
  const asFrame = panels.filter(c=>c.type!=='GROUP');
  console.log('說明卡不是 group（會多一行圖層名）：', asFrame.length ? asFrame.map(c=>c.name).join(', ') : '無');
  const emptyPanel = panels.filter(c=>c.children.filter(x=>x.type==='TEXT').length < 4);
  console.log('說明卡內容過少：', emptyPanel.length ? emptyPanel.map(c=>c.name).join(', ') : '無');
  const lens = panels.map(c=>c.children.filter(x=>x.type==='TEXT').length);
  console.log('說明卡文字節點：', panels.length + ' 張，最少 ' + Math.min(...lens) + ' 最多 ' + Math.max(...lens));
  const last = msgs[msgs.length-1];
  msgs.filter(m=>m.type==='log').slice(-10).forEach(m=>console.log('   log:', m.text||m.msg||JSON.stringify(m)));
  console.log('外掛回報：', JSON.stringify(last));
})();
