# tools — 設計稿的檢查、打包與 Figma 匯入

```
tools/
├─ figma_prep.py          Lint 設計稿 + 打包 + 產 frames.json 與匯入文件 + 自我驗證
├─ extract_layout.py      把畫框在 Chromium 裡量成 layout.json（需要 Playwright）
├─ fetch_fonts.py         量測前把 Noto Sans TC／Noto Serif TC 裝到這台機器
├─ fontfix.css            量測專用樣式，只給 extract_layout.py 用
└─ figma-plugin/          Figma 匯入外掛
   ├─ manifest.json
   ├─ code.template.js    外掛邏輯（要改改這個）
   ├─ build_plugin.py     把 layout.json 注入 template → code.js
   ├─ layout.json         量測結果（改稿後要重量，畫框數與節點數以 build_plugin.py 的輸出為準）
   ├─ test_plugin.js      用假的 Figma API 在 Node 裡實跑一次
   └─ ui.html
```

## 目前有哪些畫框

| Figma 頁 | 數量 | 內容 |
|---|---|---|
| `01 Design System` | 8 ＋ 狀態示範 8 | DS-01～DS-08；C-04 的載入中／空資料／錯誤／已結帳，S-02 的待清理確認框／載入中／空資料／錯誤 |
| `02 顧客端` | 25 | C-00、C-01、C-04、C-04b、C-04c、C-05～C-12、C-12b、C-13～C-16、C-16b、C-16c、C-17～C-21（C-02、C-03 空號） |
| `03 店家端` | 18 | S-01、S-02、S-02b～S-02d、S-03、S-03b、S-04～S-07、S-07b、S-08～S-10、S-10b、S-11、S-12 |

合計主批 51 個、選配的狀態示範 8 個，共 59 個畫框。

- **畫面清單的唯一來源是 `docs/ui/10-UI-UX規格.md` 的兩張頁面表**（含「級別」欄）。
  進階 8 張：C-09、C-10、C-11（A5）、C-15（A1）、C-17（A2）、C-20（A6）、S-09（A3）、S-12（A4）。
  A7 人氣推薦沒有獨立畫面，是 C-04 裡標「進階 A7」的一塊，不影響畫框數。
- 每張畫面在 Figma 上排哪一列，由 `figma_prep.py` 的 `FLOW` 決定；新增畫面一定要加進去。
  C-20 排在「會員」列 C-15 後面；S-03b 排在「現場桌況」列 S-03 後面；S-07b／S-10b 各自排在 S-07／S-10 後面。
- 上面三個數字寫在 `figma_prep.py` 的 `verify()` 裡，畫面增減時要一起改。

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

1. 確認檔案裡有名為 **`01 Design System`**、**`02 顧客端`**、**`03 店家端`** 的 page
   （外掛只會找現有的 page，不會新建 — Starter 方案每檔最多 3 個 page）
2. **Plugins → Development → 火鍋點餐系統 — 設計稿匯入**
3. 勾要匯入的組別，按「開始匯入」

外掛會把畫框排成格狀放進對應的 page，**接在既有內容下方**，不會蓋掉已經有的東西。

---

## 改了 HTML 之後要重跑什麼

```bash
# 0. 只想先檢查設計稿：只跑 lint，不寫 dist/，也不跑自我驗證
python3 docs/ui/mockups/tools/figma_prep.py --lint

# 1. 重新打包（lint → dist/B-inlined、frames.json → 自我驗證）
python3 docs/ui/mockups/tools/figma_prep.py

# 2. 重新量測（需要 playwright + chromium）
python3 docs/ui/mockups/tools/extract_layout.py \
        docs/ui/mockups/dist/B-inlined \
        docs/ui/mockups/tools/figma-plugin/layout.json \
        docs/ui/mockups/dist/frames.json

# 3. 重建外掛
python3 docs/ui/mockups/tools/figma-plugin/build_plugin.py

# 4. 丟進 Figma 之前先在 Node 裡實跑一次
node docs/ui/mockups/tools/figma-plugin/test_plugin.js \
     docs/ui/mockups/tools/figma-plugin/code.js
```

然後在 Figma 裡重跑一次外掛。**同名畫框、它的標題與說明卡、以及這次會重畫的
那幾列的列標題與底板，外掛會自己清掉再重建**，不用手動全選刪除；
已經從清單裡消失的畫面（例如被砍掉的功能）也會一起清掉。

---

## 前提與已知限制

**字體**：Figma 要有 `Noto Sans TC`（Regular / Medium / Bold / Black）與
`Noto Serif TC`（Bold / Black）。缺了外掛會直接停下來並告訴你缺哪個，
不會做到一半留下半成品。

**畫框命名**的唯一來源是 `dist/frames.json`，由 `figma_prep.py` 產生。
`extract_layout.py` 和外掛都讀它，不各寫一套。

**每個畫框右邊那張說明卡**的內容來自 `docs/ui/13-畫框註解.md`，
一個 `## 畫框名` 對一個畫框，底下分「規格」與「注意」兩段。
`figma_prep.py` 讀它塞進 `frames.json`，`extract_layout.py` 再帶進 `layout.json`。
**漏寫、多寫、單條超過 70 字、一張超過 11 條，自我驗證都會擋下來**，
所以新增畫面時記得順手補一段。（自我驗證只在完整模式跑，`--lint` 不會檢查這些。）

**基礎／進階的膠囊與金黃虛線底板**來自 `10-UI-UX規格.md` 頁面表的「級別」欄，
`figma_prep.py` 讀進 `frames.json` 的 `levels`；頁面表缺列或多列，自我驗證也會擋。

**畫框上方的標題是真的文字節點**，不是 Figma 自己畫的圖層名 ——
那行灰字是固定的螢幕字級，縮到看得見整列時幾乎讀不出來，也沒辦法排版。

**列底板是暖灰 `#E6DED2`（`--border`），不是白的。** 畫框底色是 `#FBF7F0`，
跟純白只差一點點，白底板一鋪下去就看不出畫框從哪裡開始、到哪裡結束。
現在是「暖灰襯墊上放淺色畫框與純白說明卡」，三層各自分得出來。
畫框底下另外墊一張同尺寸、同底色、帶柔陰影的矩形 ——
**陰影不掛在畫框本身**，畫框要對得起原稿，Inspect 時多一個 CSS 裡沒有的效果會誤導前端。

**圖片佔位**的圖層名照 `IMG／肉盤／1-1` 這種格式，直接來自 HTML 的 `data-layer`。

已知會有落差的地方：

| 項目 | 狀況 |
|---|---|
| 文字換行 | 量測前先用 `fetch_fonts.py` 裝 Google Fonts 版的 Noto Sans TC／Noto Serif TC；Figma 端的字型版本仍可能有微小差異。文字框寬度已多留 1px 緩衝，但少數長句仍可能多換一行 |
| 售完印章 | 唯一一個帶 CSS 旋轉的元素（-14°）。Figma 的旋轉基準點與 CSS 不同，位置可能要手動微調 |
| 版面結構 | 全部是絕對定位，**沒有套 Auto Layout**。圖層樹對應 DOM 結構，但拖動不會自動排版 |
| 元件 | 沒有建成 Figma Component。要做元件庫得在匯入後手動框選轉換 |

---

## 驗證方式

`extract_layout.py` 的輸出和外掛都驗過：

- **字型**：量測前先跑 `check_fonts()`，中文／數字／襯線的行高比例落在
  1.35–1.60 之外就直接中止 —— 機器沒裝中文字型時會掉回 Latin fallback，
  行高從 1.45 變 1.15，量出來的 `layout.json` 整份是壞的卻看不出來
- **抽取**：每個畫框的座標與原稿逐一比對（目前 59 個畫框；節點數每次重量都會變）
- **外掛**：`node test_plugin.js code.js` 用假的 Figma API 實跑一次，確認
  節點數、所屬 page、無重疊、無 NaN 座標、無重複畫框名、
  每個畫框都有標題／副標／說明卡，而且說明卡不是空的
