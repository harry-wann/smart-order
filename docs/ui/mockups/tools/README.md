# tools — 設計稿的檢查、打包與 Figma 匯入

```
tools/
├─ figma_prep.py          Lint 33 張設計稿 + 打包 + 產匯入文件
├─ extract_layout.py      把畫框在 Chromium 裡量成 layout.json（需要 Playwright）
└─ figma-plugin/          Figma 匯入外掛
   ├─ manifest.json
   ├─ code.template.js    外掛邏輯（要改改這個）
   ├─ build_plugin.py     把 layout.json 注入 template → code.js
   ├─ layout.json         39 個畫框、4,841 個節點的量測結果
   └─ ui.html
```

---

## 為什麼要自己寫外掛

匯入這件事沒辦法用 API 自動化，但**外掛可以**：

| 路線 | 能不能建設計節點 | 限制 |
|---|---|---|
| Figma REST API | ❌ 不行 | 只有 comments / dev_resources / variables / webhooks 四個寫入 scope |
| Figma 官方 Chrome 擴充（code to canvas） | ✅ | **要付費方案**，Starter 用不了 |
| html.to.design 免費版 | ✅ | 30 天 10 次；一次傳多檔是 PRO；圖層名不可控 |
| **自己寫外掛（本選項）** | ✅ | **無次數上限、圖層名完全可控、改稿可重跑** |

---

## 怎麼跑

### 一次性：安裝外掛

1. 開 **Figma 桌面版**（瀏覽器版不能載入本機外掛）
2. 開啟目標檔案 `🔥 火鍋點餐系統`
3. 選單 **Plugins → Development → Import plugin from manifest…**
4. 選 `docs/ui/mockups/tools/figma-plugin/manifest.json`

> 如果 `code.js` 不存在（它被 gitignore 了），先跑一次：
> ```bash
> python3 docs/ui/mockups/tools/figma-plugin/build_plugin.py
> ```

### 每次匯入

1. 確認檔案裡有名為 **`02 顧客端`** 與 **`03 店家端`** 的 page
   （外掛只會找現有的 page，不會新建 — Starter 方案每檔最多 3 個 page）
2. **Plugins → Development → 火鍋點餐系統 — 設計稿匯入**
3. 勾要匯入的組別，按「開始匯入」

外掛會把畫框排成格狀放進對應的 page，**接在既有內容下方**，不會蓋掉已經有的東西。

---

## 改了 HTML 之後要重跑什麼

```bash
# 1. 重新打包（同時會重跑 lint）
python3 docs/ui/mockups/tools/figma_prep.py

# 2. 重新量測（需要 playwright + chromium）
python3 docs/ui/mockups/tools/extract_layout.py \
        docs/ui/mockups/dist/B-inlined \
        docs/ui/mockups/tools/figma-plugin/layout.json \
        docs/ui/mockups/dist/frames.json

# 3. 重建外掛
python3 docs/ui/mockups/tools/figma-plugin/build_plugin.py
```

然後在 Figma 裡重跑一次外掛。舊的畫框要自己刪 — 外掛不會覆蓋。

---

## 前提與已知限制

**字體**：Figma 要有 `Noto Sans TC`（Regular / Medium / Bold / Black）與
`Noto Serif TC`（Bold / Black）。缺了外掛會直接停下來並告訴你缺哪個，
不會做到一半留下半成品。

**畫框命名**的唯一來源是 `dist/frames.json`，由 `figma_prep.py` 產生。
`extract_layout.py` 和外掛都讀它，不各寫一套。

**圖片佔位**的圖層名照 `IMG／肉盤／1-1` 這種格式，直接來自 HTML 的 `data-layer`。

已知會有落差的地方：

| 項目 | 狀況 |
|---|---|
| 文字換行 | 量測用的是 Noto Sans CJK，Figma 用 Noto Sans TC，字體度量有微小差異。文字框寬度已多留 1px 緩衝，但少數長句仍可能多換一行 |
| 售完印章 | 唯一一個帶 CSS 旋轉的元素（-14°）。Figma 的旋轉基準點與 CSS 不同，位置可能要手動微調 |
| 版面結構 | 全部是絕對定位，**沒有套 Auto Layout**。圖層樹對應 DOM 結構，但拖動不會自動排版 |
| 元件 | 沒有建成 Figma Component。要做元件庫得在匯入後手動框選轉換 |

---

## 驗證方式

`extract_layout.py` 的輸出和外掛都驗過：

- **抽取**：39 個畫框、3,919 個元素的座標與原稿逐一比對，0 處位移超過 0.5px
- **外掛**：用假的 Figma API 在 Node 裡實跑 `code.js`，確認節點數
  （4,841 = 2,854 frame + 1,633 text + 354 svg）、211 個陰影、
  畫框尺寸、所屬 page、無重疊、無 NaN 座標、字體載入順序正確
