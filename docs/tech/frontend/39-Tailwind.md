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
| `border` `border-paper-line` | 邊框 |
| `shadow-card` | 陰影 |
| `hidden` | `display: none` |

**數字的規則**：`1` = 4px，所以 `p-4` = 16px、`gap-3` = 12px、`w-20` = 80px。

## 用我們自己的設計系統

`tailwind.config.js` 裡把我們的色票寫進去（見 [11-設計系統](../../ui/11-設計系統.md)）：

```js
theme: {
  extend: {
    colors: {
      brand:  { 100:'#FBE8E3', 500:'#DB5B42', 600:'#C8442E', 700:'#A63522' },
      accent: { 100:'#FCF0DC', 500:'#E8A33D' },
      ink:    { 400:'#9C8E84', 600:'#6B5D54', 900:'#2B211C' },
      paper:  { DEFAULT:'#FBF7F0', card:'#FFFFFF', line:'#E6DED2' },
    },
    fontFamily: {
      serif: ['"Noto Serif TC"', 'serif'],
      sans:  ['"Noto Sans TC"', 'system-ui', 'sans-serif'],
    },
    borderRadius: { card: '12px', btn: '8px' },
  },
}
```

之後就可以寫 `bg-brand-600`、`text-ink-900`、`rounded-card`——**全隊用同一組顏色，不會有人手打 `#C8442D`**。

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
  return <button className={`rounded-btn font-medium transition-all active:scale-[.98]
    disabled:opacity-40 ${styles[variant]} ${sizes[size]} ${className}`} {...rest} />;
}
```

之後全專案就寫 `<Button>加入購物車</Button>`，乾淨。

**我們要自己寫的 10 個元件**：Button、Card、MenuItemRow、Notify、Stepper、OptionCard、Badge、InfoBox、Toast、三態（載入中／空資料／錯誤，原本的 EmptyState 併在這裡），清單以 [11-設計系統](../../ui/11-設計系統.md) §5 為準。

## 15 分鐘動手小練習

在 Vite 專案裝 Tailwind（照 [官方 Vite 指南](https://tailwindcss.com/docs/guides/vite)），然後刻一張菜單卡片：

```jsx
export default function App() {
  return (
    <div className="min-h-screen bg-[#FBF7F0] p-4">
      <div className="flex items-center gap-3 bg-white rounded-xl border border-[#E6DED2] p-4 shadow-sm">
        <div className="w-20 h-20 rounded-xl bg-[#F5EFE5] shrink-0" />
        <div className="flex-1">
          <h3 className="text-lg font-bold text-[#2B211C]">美國牛五花</h3>
          <p className="text-sm text-[#6B5D54] mt-0.5">厚切 3mm，涮 8 秒最好吃</p>
          <p className="text-xl font-bold text-[#C8442E] mt-1">$280</p>
        </div>
        <button className="w-11 h-11 rounded-full bg-[#C8442E] text-white text-2xl
                           active:scale-95 transition-transform">＋</button>
      </div>
    </div>
  );
}
```

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
→ **設定好 `tailwind.config.js` 之後一律用 `bg-brand-600`。**

**③ class 排列雜亂**
裝 Prettier 的 Tailwind 外掛會自動排序，看起來整齊很多。

**④ 跟其他 UI 套件混用**
MUI、Ant Design 有自己的樣式系統，會跟 Tailwind 打架。**我們不裝。**

**⑤ 忘記設定 `content`**

```js
content: ['./index.html', './src/**/*.{js,jsx}'],
```
沒設的話 Tailwind 不知道要掃哪些檔案，樣式全部不見。

## 常見錯誤訊息對照

| 症狀 | 原因 | 怎麼修 |
|---|---|---|
| 樣式完全沒生效 | `index.css` 沒引入 Tailwind，或 `content` 設錯 | 檢查兩個地方 |
| 某個 class 沒生效 | 動態拼字串 | 改成完整字串 |
| 自訂顏色不能用 | config 沒設或沒重啟 | 改 config 後要重跑 dev |
| 手機版破版 | 有東西 `min-width` 太寬 | 加 `min-w-0` 或 `flex-1` |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 一個 class 一個屬性 | Utility-first CSS |
| 手機優先 | mobile-first |
| 斷點 | breakpoint（`sm:` `md:` `lg:`） |
| 掃描原始碼找用到的 class | JIT / content scanning |
| 自訂設定 | `tailwind.config.js` |

## 自我檢核

1. `p-4` 是幾 px？
2. `md:p-6` 是什麼意思？
3. 為什麼 `text-${color}-600` 不會生效？
4. class 太長的正確解法是什麼？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [Tailwind 官方文件](https://tailwindcss.com/docs) | 英文（但都是查用） | 入門 | 查用 |
| [Tailwind CSS 中文文件](https://www.tailwindcss.cn/docs) | 簡中 | 入門 | 查用 |
| 我們的 [11-設計系統](../../ui/11-設計系統.md) | 繁中 | 入門 | 20 分 |

> Tailwind **不需要從頭看到尾**，把常用的十幾個記起來，其他的用官網搜尋就好。

## 相關頁面

[React 與 JSX](34-React與JSX.md)　[設計系統](../../ui/11-設計系統.md)　[Vite](33-Vite.md)
