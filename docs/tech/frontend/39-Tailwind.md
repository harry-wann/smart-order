# Tailwind CSS

**難度** ★★☆☆☆　**用在哪些模組** 所有前端工作　**哪幾週** 第 1 週

## 一句話

Tailwind 是**把每個 CSS 屬性都變成一個小 class**，你直接在 HTML 上組合。

## 想像一下

**傳統寫法**：先想一個名字，再去別的檔案寫樣式。

```html
<div class="menu-item-card">...</div>
```
```css
/* 在另一個檔案，或檔案的另一端 */
.menu-item-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: 12px;
}
```

麻煩的地方：
- 要一直發明名字（`card`、`card-wrapper`、`card-inner`、`card-inner-2`…）
- 改樣式要在兩個檔案之間跳來跳去
- 刪掉元件時，那段 CSS 沒人敢刪（怕別的地方也在用）

**Tailwind 寫法**：

```html
<div class="flex items-center gap-3 p-4 bg-white rounded-xl">...</div>
```

不用想名字、不用切檔案、刪掉元件樣式就跟著消失。

## 常用 class 對照表

| Tailwind | CSS |
|---|---|
| `flex` | `display: flex` |
| `items-center` | `align-items: center` |
| `justify-between` | `justify-content: space-between` |
| `gap-3` | `gap: 12px` |
| `p-4` / `px-4` / `py-2` | `padding` / 左右 / 上下 |
| `m-4` / `mt-2` | `margin` / `margin-top` |
| `w-20` `h-20` | `width/height: 80px` |
| `w-full` | `width: 100%` |
| `text-lg` `text-xl` | 字級 |
| `font-bold` | `font-weight: 700` |
| `bg-white` | 背景白 |
| `rounded-xl` | `border-radius: 12px` |
| `border` `border-line` | 邊框（`border-line` 是我們的分隔線色） |
| `shadow-card` | 陰影 |
| `hidden` | `display: none` |

**數字的規則**：`1` = 4px，所以 `p-4` = 16px、`gap-3` = 12px、`w-20` = 80px。

## 用我們自己的設計系統

**設計系統已經設定好了，你不用自己設定。** 顏色、字級、間距、圓角都是現成的 class，
完整清單與使用規則看 [14-色彩Token](../../ui/14-色彩Token.md) 與 [11-設計系統](../../ui/11-設計系統.md)。

我們用的是 **Tailwind v4**，它**沒有 `tailwind.config.js`**，設定直接寫在 CSS 裡：

```css
/* src/style.css —— 整個專案的樣式進入點 */
@import "tailwindcss";          /* 1. preflight 與所有內建 utility */

@import "./styles/tokens.colors.css";   /* 2. 設計系統的值 */
@import "./styles/tokens.type.css";
@import "./styles/tokens.space.css";

@import "./styles/base.css";    /* 3. 文件預設值，會用到上面的 token */
```

**順序不能換。** `tailwindcss` 要在最前面，`base.css` 要在 token 後面。

```css
/* src/styles/tokens.colors.css —— 節錄 */
@theme {
  --color-brand-600: #c8442e;
  --color-ink-900:   #2b211c;
  --color-line:      #e6ded2;
  --shadow-card:     0 1px 2px rgb(43 33 28 / 0.06), 0 4px 12px rgb(43 33 28 / 0.05);
}
```

`@theme` 裡每宣告一個變數，Tailwind 就自動長出對應的 class：

| 你宣告 | 自動產生 |
|---|---|
| `--color-brand-600` | `bg-brand-600`　`text-brand-600`　`border-brand-600` |
| `--radius-card` | `rounded-card` |
| `--spacing-card` | `p-card`　`px-card`　`mt-card`　`gap-card` |
| `--font-serif` | `font-serif` |

### 字級：用 `type-*`，不要自己拼

字級不是 `@theme`，是十個現成的 class（寫在 `tokens.type.css`）。
每一個都已經把**字體、大小、行高、字重**一次套好：

```jsx
<h1 className="type-h1">火鍋點餐系統</h1>       {/* 明體 28 / 1.4 / 700 */}
<p  className="type-body">每桌至少需點一份鍋底</p> {/* 黑體 16 / 1.75 / 400 */}
<span className="type-price">$380</span>        {/* 黑體 20 / 1.4 / 700 等寬數字 */}
```

十個是 `type-display`／`type-h1`／`type-h2`／`type-h3`／`type-body`／`type-body-sm`／
`type-caption`／`type-price`／`type-button`／`type-kds-table`，對照 [11-設計系統](../../ui/11-設計系統.md) §3.2。

**不要寫成 `text-[28px] leading-[1.4] font-bold font-serif`。** 拆成四件事就一定會漏掉其中一個，
最常漏的是 `font-serif`——漏了不會報錯，只是標題悄悄變成黑體。

### 間距：照刻度寫數字就好

`p-1/p-2/p-3/p-4/p-6/p-8/p-12/p-16` 就是設計系統的 `4/8/12/16/24/32/48/64`，直接用。
只有幾個例外有自己的名字：`p-card`(20)、`p-row`(16)、`px-page`、`mt-section`(24)、`mt-section-lg`(48)。

### 圓角：七個值各有名字

`rounded-card`(12)／`rounded-btn`(8)／`rounded-check`(6)／`rounded-stamp`(4)／
`rounded-notify`(14)／`rounded-sheet`(20)／`rounded-pill`(999)。

**不要全部用 `rounded-xl`。** 「所有東西都同一個大圓角」是 AI 生成介面最明顯的特徵，
[11-設計系統](../../ui/11-設計系統.md) §7 有列這條。
| `--color-ink-900` | `text-ink-900`　`bg-ink-900`　`bg-ink-900/50`（半透明） |
| `--shadow-card` | `shadow-card` |

所以你寫 `bg-brand-600`、`text-ink-900`、`shadow-card` 就好——**全隊用同一組顏色，不會有人手打 `#C8442D`**。

圓角不用自訂，Tailwind 內建的剛好對得上我們的規範：**按鈕 8px = `rounded-lg`、卡片 12px = `rounded-xl`**。

> **要加新顏色前先看 [14-色彩Token](../../ui/14-色彩Token.md) §3 的三條規則**，尤其是「只有一個畫面用得到的顏色不要加進共用檔」。

## 響應式：手機優先

```html
<div class="p-4 md:p-6 lg:p-8">
```

意思是：**預設 16px，螢幕 ≥768px 時 24px，≥1024px 時 32px**。

**沒有前綴的是手機版**，這叫「手機優先」。我們顧客端主要就寫沒前綴的。

| 前綴 | 從幾 px 開始 |
|---|---|
| （無） | 0 |
| `sm:` | 640 |
| `md:` | 768 |
| `lg:` | 1024 |

## 狀態變化

```html
<button class="bg-brand-600 hover:bg-brand-500 active:scale-95
               disabled:opacity-40 disabled:cursor-not-allowed
               focus-visible:outline focus-visible:outline-2">
```

滑過、按下、停用、鍵盤聚焦——全部直接寫在 class 裡。

## class 太長怎麼辦

這是 Tailwind 最常被抱怨的地方。解法**不是回去寫 CSS，是包成元件**：

```jsx
// components/Button.jsx —— 長的 class 只出現在這一個檔案
const styles = {
  primary:   'bg-brand-600 text-white hover:bg-brand-500 active:bg-brand-700',
  secondary: 'bg-white text-brand-600 border-[1.5px] border-brand-600 hover:bg-brand-100',
};
const sizes = { lg: 'h-[52px] text-[18px] px-6', md: 'h-11 text-base px-5' };

export default function Button({ variant='primary', size='lg', className='', ...rest }) {
  return <button className={`rounded-lg font-medium transition-all active:scale-[.98]
    disabled:opacity-40 ${styles[variant]} ${sizes[size]} ${className}`} {...rest} />;
}
```

之後全專案就寫 `<Button>加入購物車</Button>`，乾淨。

**我們要自己寫的 10 個元件**：Button、Card、MenuItemRow、Notify、Stepper、OptionCard、Badge、InfoBox、Toast、三態（載入中／空資料／錯誤，原本的 EmptyState 併在這裡），清單以 [11-設計系統](../../ui/11-設計系統.md) §5 為準。

## 15 分鐘動手小練習

Tailwind 和色票在 `frontend/` 已經裝好設定好了，`npm run dev` 就能開始。刻一張菜單卡片：

```jsx
export default function App() {
  return (
    <div className="min-h-screen bg-paper p-4">
      <div className="flex items-center gap-3 bg-surface rounded-xl border border-line p-4 shadow-card">
        <div className="w-20 h-20 rounded-xl bg-surface-2 shrink-0" />
        <div className="flex-1">
          <h3 className="text-lg font-bold text-ink-900">美國牛五花</h3>
          <p className="text-sm text-ink-600 mt-0.5">厚切 3mm，涮 8 秒最好吃</p>
          <p className="text-xl font-bold text-brand-600 mt-1">$280</p>
        </div>
        <button className="w-11 h-11 rounded-full bg-brand-600 text-white text-2xl
                           active:scale-95 transition-transform">＋</button>
      </div>
    </div>
  );
}
```

注意這裡**一個 hex 都沒有**——`bg-paper`、`border-line`、`text-ink-600` 全部來自 token。
這就是我們要的狀態，之後改色票只要動一個檔案。

**然後把瀏覽器縮到 375px 寬**，看看會不會破版。

## 你會遇到的坑

**① 用字串拼 class**

```jsx
<div className={`text-${color}-600`}>     // ❌ Tailwind 掃不到，樣式不會生成
<div className={color === 'red' ? 'text-brand-600' : 'text-ink-600'}>  // ✅
```

Tailwind 是在**編譯時**掃描你的原始碼找出用到哪些 class。動態拼出來的它看不見。

**② 到處寫死顏色**
`bg-[#C8442E]` 這種寫法能用，但全專案散落魔術數字。
→ **一律用 `bg-brand-600`。Code review 看到 hex 就退。**

**③ class 排列雜亂**
裝 Prettier 的 Tailwind 外掛會自動排序，看起來整齊很多。

**④ 跟其他 UI 套件混用**
MUI、Ant Design 有自己的樣式系統，會跟 Tailwind 打架。**我們不裝。**

**⑤ 照網路上的 v3 教學做**
這是目前最容易踩的一個。網路上絕大多數 Tailwind 教學（包含很多 2025 年的）寫的是 **v3**，
我們用的是 **v4**，差別大到照做會直接失敗：

| v3 教學會叫你做 | v4 實際上 |
|---|---|
| `npx tailwindcss init` 產生 `tailwind.config.js` | **沒有 config 檔**，設定寫在 CSS 的 `@theme` |
| 設定 `content: [...]` 指定要掃哪些檔 | **自動偵測**，沒有這個設定 |
| `@tailwind base; @tailwind components; @tailwind utilities;` | 一行 `@import "tailwindcss";` |
| 裝 `postcss` + `autoprefixer` | 用 `@tailwindcss/vite` 外掛，不用 PostCSS |

判斷方法：**看到 `tailwind.config.js` 就是 v3 的教學**，直接跳過。

**⑥ `@theme` 放錯位置**
`@theme` 必須在 `@import "tailwindcss";` **之後**才生效。我們已經把順序排好在 `src/style.css`，
不要自己在別的檔案另外寫 `@theme`。

**⑦ 該用任意值語法的時候**
`bg-[var(--kds-card)]` 這種中括號寫法是給**單頁專用色**用的（例如 S-04 出菜看板），
共用色一律用 `bg-brand-600` 這種正常 class。看 [14-色彩Token](../../ui/14-色彩Token.md) §5。

## 常見錯誤訊息對照

| 症狀 | 原因 | 怎麼修 |
|---|---|---|
| 樣式完全沒生效 | `src/style.css` 沒被載到，或 `@import "tailwindcss"` 不見了 | 檢查 `index.html` 的 `<link>` 和 `style.css` |
| 某個 class 沒生效 | 動態拼字串 | 改成完整字串 |
| 自訂顏色不能用（`bg-brand-600` 沒色） | `tokens.*.css` 沒被 `@import`，或順序排在 `@import "tailwindcss"` 前面 | 檢查 `src/style.css` 的 import 順序 |
| `type-h1` 沒生效 | 拼錯成 `text-h1` | 字級的前綴是 `type-`，不是 `text-` |
| 標題變成黑體 | 字級自己拼、漏了 `font-serif` | 改用 `type-h1`／`type-h2`／`type-display` |
| 中文有字、數字字型不對 | Google Fonts 沒載到 | 檢查 `index.html` 的 `fonts.googleapis.com` 那三行 |
| 跟著教學做卻一直失敗 | 那是 v3 的教學 | 見「你會遇到的坑 ⑤」 |
| 手機版破版 | 有東西 `min-width` 太寬 | 加 `min-w-0` 或 `flex-1` |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 一個 class 一個屬性 | Utility-first CSS |
| 手機優先 | mobile-first |
| 斷點 | breakpoint（`sm:` `md:` `lg:`） |
| 掃描原始碼找用到的 class | JIT / 自動偵測來源（v4 不用設定） |
| 自訂設定 | CSS 裡的 `@theme`（v4；v3 是 `tailwind.config.js`） |
| 一組有名字的設計值 | design token |

## 自我檢核

1. `p-4` 是幾 px？
2. `md:p-6` 是什麼意思？
3. 為什麼 `text-${color}-600` 不會生效？
4. class 太長的正確解法是什麼？
5. 我們用 v3 還是 v4？怎麼一眼認出一份教學是 v3 的？
6. 想用一個新顏色，第一件事要做什麼？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [Tailwind 官方文件](https://tailwindcss.com/docs) | 英文（但都是查用） | 入門 | 查用 |
| [Tailwind CSS 中文文件](https://www.tailwindcss.cn/docs) | 簡中 | 入門 | 查用 |
| 我們的 [11-設計系統](../../ui/11-設計系統.md) | 繁中 | 入門 | 20 分 |
| 我們的 [14-色彩Token](../../ui/14-色彩Token.md) | 繁中 | 入門 | 10 分 |

> 查官方文件時注意**左上角的版本要是 v4**。中文文件站目前多半還停在 v3。

> Tailwind **不需要從頭看到尾**，把常用的十幾個記起來，其他的用官網搜尋就好。

## 相關頁面

[React 與 JSX](34-React與JSX.md)　[設計系統](../../ui/11-設計系統.md)　[色彩 Token](../../ui/14-色彩Token.md)　[Vite](33-Vite.md)
