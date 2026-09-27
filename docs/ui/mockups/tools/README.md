# tools — 設計系統對帳、設計稿檢查與 Figma 匯入

```
tools/
├─ check_tokens.py        ★ 對帳：文件講的設計系統有沒有跟前端的 token 對上
├─ figma_prep.py          Lint 設計稿 + 打包 + 產 frames.json 與匯入文件 + 自我驗證
├─ extract_layout.py      把畫框在 Chromium 裡量成 layout.json（需要 Playwright）
├─ fetch_fonts.py         量測前把 Noto Sans TC／Noto Serif TC 裝到這台機器
├─ figma_links.py         匯入後把 Figma 畫框連結寫回設計稿、總覽頁與 spec/05 §1.4.3
├─ fontfix.css            量測專用樣式，只給 extract_layout.py 用
└─ figma-plugin/          Figma 匯入外掛
   ├─ manifest.json
   ├─ code.template.js    外掛邏輯（要改改這個）
   ├─ build_plugin.py     把 layout.json 注入 template → code.js
   ├─ layout.json         量測結果（改稿後要重量，畫框數與節點數以 build_plugin.py 的輸出為準）
   ├─ test_plugin.js      用假的 Figma API 在 Node 裡實跑一次
   ├─ node-ids.json       匯入後從外掛面板複製出來的「畫框名 → 節點 id」（要進版控）
   └─ ui.html
```

## check_tokens.py — 改完 token 或改完文件就跑

```bash
python3 docs/ui/mockups/tools/check_tokens.py
```

以 `frontend/src/styles/tokens.*.css` 為**唯一的真實來源**，檢查六件事：

| # | 檢查什麼 |
|---|---|
| ① | 色票：11-設計系統 §2.1 的 `@theme` 區塊，名稱與值要跟 `tokens.colors.css` 一字不差 |
| ② | 色票：設計稿 `_shared.css` 的舊變數，交集內的值要一致 |
| ③ | 字級：`tokens.type.css` 的十個 `type-*` vs §3.2 的字體／大小／行高／字重 |
| ④ | 圓角：`tokens.space.css` 的七個 `--radius-*` vs §2.2 |
| ⑤ | 間距：`tokens.space.css` 的 `--spacing-*` vs §4.1 的表 |
| ⑥ | 雜色：`docs/**/*.md` 裡有沒有色票以外的 hex |

有任何不一致會列出來並回傳 **exit code 1**，所以可以直接接進 CI。
`--quiet` 只印不一致的項目。

**兩個要跟著改的地方**（都在腳本上方，有註解）：

- `SPACING_LABELS` — §4.1 表格的「用途」欄文字改了，這裡要跟著改，否則檢查會說「找不到這一列」
- `KNOWN_HEX` — 刻意不進色票的顏色（工作包識別色、Mermaid 圖的配色、歷史紀錄…）。
  加新的要寫清楚為什麼，不要為了讓檢查過關就往裡面塞

> 這支腳本跟 `figma_prep.py` 管的是不同的東西：
> `figma_prep.py` 檢查**設計稿本身**（畫框、間距例外、圖片佔位說明），
> `check_tokens.py` 檢查**文件與前端程式碼之間**有沒有對上。

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
**同名畫框會沿用**（內容重建，節點 id 不變），所以已經貼出去的 Figma 連結不會失效。

### 匯入後：把 Figma 連結寫回文件

1. 匯入完成後，外掛面板最下面會列出每個畫框的 id，按 **「複製畫框 id」**
2. 貼進 `docs/ui/mockups/tools/figma-plugin/node-ids.json`（整份覆蓋）
3. 跑：
   ```bash
   python3 docs/ui/mockups/tools/figma_links.py
   python3 docs/build_site.py
   ```

`figma_links.py` 會改三個地方，可以重複跑（每次先清掉舊連結再寫）：

| 位置 | 加了什麼 |
|---|---|
| 每張設計稿 HTML | 畫框上方標題列最後面的「在 Figma 開啟 ↗」（打包時跟標題列一起拿掉，不會進 Figma） |
| `mockups/index.html` | 頁首的工作包圖例；每張卡片底下的工作包顏色與「在 Figma 開啟 ↗」 |
| `spec/05-開發流程與分工.md` §1.4.3 | 「Figma」欄 |

只有**新增畫面**或**在 Figma 裡刪掉重建**時，id 才會變，才需要重貼。
有畫框沒拿到 id 時，腳本會列出來並以非 0 結束。

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

**工作包顏色**來自 `spec/05-開發流程與分工.md` §1.4.2（工作包表的「識別色」欄）與
§1.4.3（畫面與工作包對照表）。`figma_prep.py` 讀進 `frames.json` 的 `pkgs`，
外掛在畫框上方畫一條色條、在級別膠囊旁邊加「工作包 A・主題」，每頁最上面放一張圖例。
進階畫面還沒分工，所以沒有工作包顏色；基礎畫面沒分到工作包、或進階畫面被分了，自我驗證都會擋。
**改分工只要改 05 那兩張表，再重跑 1～4 步與外掛。**

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
  每個畫框都有標題／副標／說明卡，而且說明卡不是空的；
  基礎畫面都有工作包標籤與色條、進階畫面都有金黃底板；
  **連跑兩次**，第二次畫框 id 不變、頂層節點數不變
