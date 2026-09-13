# GitHub 與 Pull Request

**難度** ★★☆☆☆　**用在哪些模組** 全員　**哪幾週** 全程

## 一句話

GitHub 是**放程式碼的雲端硬碟**，Pull Request 是**「我改好了，你幫我看一下再收進去」的申請單**。

## 想像一下

Git 是你自己電腦上的存檔系統。但五個人怎麼交換進度？

GitHub 就是那個中央的地方。想像成一個共用的 Google Drive，但專門為程式碼設計，而且它記得每一次修改。

**Pull Request（簡稱 PR）** 則是一個禮貌的規矩：

> 你不會直接衝進去改公司的官方文件。你會說「我寫了一版，主管看過再放上去」。

PR 就是這張申請單。上面會顯示：
- 你改了哪些檔案、哪幾行（綠色是新增、紅色是刪除）
- 你寫的說明
- 隊友的留言和「同意」按鈕

## 我們的規矩

1. **`main` 和 `develop` 不能直接 push**（GitHub 設定上會擋）
2. 所有東西都要透過 PR 進去
3. **每個 PR 至少要一個隊友按同意**才能合併
4. PR 描述要寫三件事：做了什麼、怎麼測試、有沒有動到共用檔案

## PR 的完整流程

```bash
# 1. 開分支寫程式（見上一頁）
git checkout -b feature/menu-crud
# ... 寫、commit ...
git push -u origin feature/menu-crud
```

然後去 GitHub 網站：

1. 它會跳出一個黃色橫條「Compare & pull request」，按下去
2. 標題寫清楚：`feat: 菜單分類與品項查詢 API`
3. 描述寫：

```
## 做了什麼
- GET /api/menu/categories 分類清單
- GET /api/menu/items 品項清單，支援 categoryId 篩選

## 怎麼測試
1. 啟動後端，開 http://localhost:8080/swagger-ui.html
2. 試打這兩支 API，應該回傳種子資料的 8 個分類

## 有沒有動到共用檔案
沒有。只新增了 menu 資料夾底下的檔案。
```

4. 右邊 Reviewers 選一個隊友
5. 隊友看完按 Approve，你就可以按 Merge

## Code Review 怎麼看

被指定當 reviewer 的時候，你要看什麼？**不要只按同意。**

| 看什麼 | 例子 |
|---|---|
| **我看得懂嗎** | 變數叫 `a`、`temp1` 就該說 |
| **有沒有寫死的東西** | 服務費 `0.1` 直接寫在程式裡？應該放設定 |
| **錯誤有處理嗎** | 查不到資料的時候會怎樣？ |
| **有沒有動到大家的東西** | 改了 Entity 卻沒講 |
| **有沒有 `System.out.println`** | 忘記刪的除錯訊息 |

留言要具體且對事不對人：

- ❌「這寫得不好」
- ✅「這裡如果 categoryId 是 null 會 NPE，要不要加個判斷？」

**看不懂就問，這是 review 的重點之一。** 如果隊友的程式碼你看不懂，那三個月後他自己也會看不懂。

## 15 分鐘動手小練習

跟一個隊友配對做一次：

1. 你開分支，改 README 加一行字，push
2. 發 PR，指定他當 reviewer
3. 他在 GitHub 上留一個 comment
4. 你改一下，再 push（PR 會自動更新，不用重發）
5. 他按 Approve，你按 Merge
6. 回本機 `git checkout develop && git pull`，看到你的改動進來了

跑過一次，整個流程就不陌生了。

## 你會遇到的坑

**① PR 太大**
一次改了 40 個檔案，沒有人有辦法認真看，reviewer 只會閉著眼睛按同意。
→ **一個 PR 一件事。** 超過 400 行就該拆。

**② 描述寫「完成功能」**
reviewer 不知道要看什麼、怎麼測。

**③ 合併後忘記刪分支**
分支列表會變成一坨。GitHub 合併後會問你要不要刪，按下去就好。

**④ 有人把 `.env` 或密碼 commit 上去**
一旦推到 GitHub，就算你之後刪掉，歷史紀錄裡還在。
→ **第一天就要設好 `.gitignore`。**

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `This branch has conflicts that must be resolved` | 跟目標分支衝突了 | 本機 `git pull origin develop` 解完衝突再 push |
| `Review required` | 還沒有人 approve | 找隊友看 |
| `Permission to ... denied` | 你沒有這個 repo 的權限 | 請組長把你加進 collaborators |
| `remote: Support for password authentication was removed` | GitHub 不能用密碼了 | 改用 SSH key 或 Personal Access Token |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 雲端的程式碼倉庫 | remote repository |
| 申請單 | Pull Request（PR） |
| 幫我看一下 | Code Review |
| 同意 | Approve |
| 收進去 | Merge |
| 擋住不准直接改 | Branch Protection |

## 自我檢核

1. 為什麼要有 PR，不能直接 push 到 develop？
2. PR 描述要寫哪三件事？
3. 當 reviewer 時，你至少要檢查哪些東西？
4. 為什麼 PR 不能太大？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [GitHub 官方 Hello World 教學](https://docs.github.com/zh/get-started/start-your-journey/hello-world) | 簡中 | 入門 | 20 分 |
| [新手也能懂的 Git 教學](https://medium.com/@flyotlin/%E6%96%B0%E6%89%8B%E4%B9%9F%E8%83%BD%E6%87%82%E7%9A%84git%E6%95%99%E5%AD%B8-c5dc0639dd9) 後半有 GitHub 流程 | 繁中 | 入門 | 20 分 |

## 相關頁面

[Git 是什麼](02-Git是什麼.md)　[分支、合併與衝突](03-分支與合併.md)　[GitHub Actions CI](../quality/49-GitHubActions.md)
