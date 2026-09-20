/* 設計系統自檢頁。
   開始做真正的畫面時整個 App.jsx 可以刪掉換成 <RouterProvider />，
   但刪掉前先跑一次 npm run dev 看這頁，確認 token 都有生效。 */

const TYPE = [
  ['type-display', '合計 $1,280', '32 / 1.3 Serif 900 — 結帳合計'],
  ['type-h1', '火鍋點餐系統', '28 / 1.4 Serif 700 — 頁面主標題'],
  ['type-h2', '經典湯底', '22 / 1.5 Serif 700 — 區塊標題、分類名'],
  ['type-h3', '麻辣鴛鴦鍋', '18 / 1.6 Sans 700 — 品項名稱'],
  ['type-body', '每桌至少需點一份鍋底，送出訂單時會檢查。', '16 / 1.75 Sans 400 — 內文最小值'],
  ['type-body-sm', '已選：全份、辣度中辣', '14 / 1.7 Sans 400 — 次要資訊'],
  ['type-caption', '19:42 由 0912-345-678 加入', '13 / 1.6 Sans 400 — 僅非關鍵資訊'],
  ['type-price', '$380', '20 / 1.4 Sans 700 tabular — 品項價格'],
  ['type-button', '送出整桌點餐', '18 / 1 Sans 500 — 按鈕文字'],
  ['type-kds-table', 'A12', '32 / 1.2 Sans 900 — KDS 桌號'],
]

const COLORS = [
  ['bg-brand-600 text-white', 'brand-600'],
  ['bg-accent-500 text-ink-900', 'accent-500'],
  ['bg-success-bg text-success-ink', 'success'],
  ['bg-warning-bg text-warning-ink', 'warning'],
  ['bg-danger-bg text-danger-ink', 'danger'],
  ['bg-info-bg text-info-ink', 'info'],
  ['bg-surface border border-line shadow-card', 'surface'],
]

const RADIUS = [
  ['rounded-card', 'card 12'],
  ['rounded-btn', 'btn 8'],
  ['rounded-check', 'check 6'],
  ['rounded-stamp', 'stamp 4'],
  ['rounded-notify', 'notify 14'],
  ['rounded-sheet', 'sheet 20'],
  ['rounded-pill', 'pill 999'],
]

function Row({ label, children }) {
  return (
    <div className="flex items-baseline gap-4 border-b border-line py-3 last:border-b-0">
      <code className="type-caption w-36 shrink-0 text-ink-600">{label}</code>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

export default function App() {
  return (
    <main className="mx-auto max-w-[900px] px-page py-section">
      <h1 className="type-h1">設計系統自檢</h1>
      <p className="type-body-sm mt-2 text-ink-600">
        這頁的每一項都直接對應 <code>docs/ui/11-設計系統.md</code>。
        某一區看起來不對，就是那組 token 沒生效。
      </p>

      {/* ---------------------------------------------------------------- */}
      <h2 className="type-h2 mt-section-lg">1. 字型</h2>
      <p className="type-body-sm mt-2 text-ink-600">
        標題要是<span className="font-serif font-bold">明體（Noto Serif TC）</span>、
        內文要是<span className="font-sans font-bold">黑體（Noto Sans TC）</span>。
        兩行看起來一樣，就是 Google Fonts 沒載到。
      </p>
      <div className="mt-section rounded-card bg-surface p-card shadow-card">
        <Row label="font-serif">
          <span className="font-serif text-[22px] font-bold">老陳麻辣鍋 2026 年 9 月</span>
        </Row>
        <Row label="font-sans">
          <span className="font-sans text-[22px] font-bold">老陳麻辣鍋 2026 年 9 月</span>
        </Row>
        <Row label="tabular-nums">
          {/* 數字沒對齊就是掉拉丁備援了 */}
          <div className="tabular-nums leading-tight">
            <div>$1,280</div>
            <div>$9,999</div>
            <div>$110</div>
          </div>
        </Row>
      </div>

      {/* ---------------------------------------------------------------- */}
      <h2 className="type-h2 mt-section-lg">2. 字級階層</h2>
      <div className="mt-section rounded-card bg-surface p-card shadow-card">
        {TYPE.map(([cls, sample, note]) => (
          <Row key={cls} label={cls}>
            <div className={cls}>{sample}</div>
            <div className="type-caption mt-1 text-ink-400">{note}</div>
          </Row>
        ))}
      </div>

      {/* ---------------------------------------------------------------- */}
      <h2 className="type-h2 mt-section-lg">3. 色彩</h2>
      <div className="mt-section flex flex-wrap gap-2">
        {COLORS.map(([cls, name]) => (
          <span key={name} className={`rounded-btn px-4 py-2 type-body-sm ${cls}`}>
            {name}
          </span>
        ))}
      </div>

      {/* ---------------------------------------------------------------- */}
      <h2 className="type-h2 mt-section-lg">4. 圓角</h2>
      <p className="type-body-sm mt-2 text-ink-600">
        七個值要看得出差別。全部一樣圓就是 token 沒生效——
        「所有東西都同一個大圓角」是 §7 列的 AI 感特徵。
      </p>
      <div className="mt-section flex flex-wrap gap-3">
        {RADIUS.map(([cls, name]) => (
          <div
            key={cls}
            className={`flex h-20 w-24 items-center justify-center border-2 border-brand-600 bg-brand-100 ${cls}`}
          >
            <span className="type-caption text-brand-700">{name}</span>
          </div>
        ))}
      </div>

      {/* ---------------------------------------------------------------- */}
      <h2 className="type-h2 mt-section-lg">5. 間距</h2>
      <p className="type-body-sm mt-2 text-ink-600">
        灰底是內距。卡片 20px 要明顯比列表列 16px 寬一圈（§4.1.1 例外 1）。
      </p>
      <div className="mt-section flex flex-wrap gap-3">
        <div className="rounded-card bg-surface-2 p-card">
          <div className="rounded-btn bg-surface px-3 py-2 type-body-sm">p-card（20）</div>
        </div>
        <div className="rounded-card bg-surface-2 p-row">
          <div className="rounded-btn bg-surface px-3 py-2 type-body-sm">p-row（16）</div>
        </div>
        <div className="rounded-card bg-surface-2 p-4">
          <div className="rounded-btn bg-surface px-3 py-2 type-body-sm">p-4（16，刻度）</div>
        </div>
      </div>
      <div className="mt-section flex flex-wrap items-center gap-2">
        <span className="rounded-pill bg-accent-100 px-2.5 py-0.5 type-caption text-warning-ink">
          膠囊 px-2.5 py-0.5
        </span>
        <span className="rounded-stamp bg-white/75 px-2 py-0.5 type-caption text-danger">
          售完 px-2 py-0.5
        </span>
        <button className="rounded-btn bg-brand-600 px-6 type-button h-[52px] text-white">
          lg h-[52px] px-6
        </button>
        <button className="rounded-btn bg-brand-600 px-5 h-11 text-base font-medium text-white">
          md h-11 px-5
        </button>
        <button className="rounded-btn bg-brand-600 px-3.5 h-9 text-sm font-medium text-white">
          sm h-9 px-3.5
        </button>
      </div>
    </main>
  )
}
