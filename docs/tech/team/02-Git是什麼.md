# Git 是什麼

**難度** ★★☆☆☆　**用在哪些模組** 全員　**哪幾週** 第 0 週

## 一句話

Git 就是**程式碼的存檔紀錄**，像電玩隨時可以存檔、隨時可以讀檔回到過去。

## 想像一下

你在寫一份很重要的報告。你可能會這樣存檔：

```
報告.docx
報告_修改版.docx
報告_修改版2.docx
報告_最終版.docx
報告_最終版_真的final.docx
```

亂吧。而且如果你想知道「最終版比修改版2 到底改了哪裡」，你只能自己一行一行比對。

如果有五個人一起寫這份報告，會更慘——大家都在改同一個檔案，最後不知道誰蓋掉誰的。

**Git 就是來解決這件事的。** 檔案永遠只有一個名字，但 Git 幫你記住每一次的變化：什麼時候改的、誰改的、改了哪幾行、為什麼改。你隨時可以回到任何一個時間點。

## 三個動作就是全部

Git 的日常只有三個動作。想像你在整理要寄出的包裹：

| 動作 | 指令 | 比喻 |
|---|---|---|
| **1. 挑東西放進箱子** | `git add` | 選這次要記錄哪些檔案 |
| **2. 封箱並貼標籤** | `git commit -m "說明"` | 存檔，並寫下這次改了什麼 |
| **3. 寄出去** | `git push` | 把存檔上傳到 GitHub 給大家 |

還有一個反方向的：

| 動作 | 指令 | 比喻 |
|---|---|---|
| **收別人寄來的包裹** | `git pull` | 把隊友的最新進度抓下來 |

**就這四個。** 你 90% 的時間只會用到這四個。

## 在我們的專案裡

你每天的流程長這樣：

```bash
# 早上第一件事：把大家的進度抓下來
git pull

# ... 寫了兩個小時的程式 ...

# 存檔
git add .                              # 這次改的全部放進箱子
git commit -m "feat: 新增菜單查詢 API"   # 封箱貼標籤
git push                               # 寄給大家
```

**每天下班前一定要 push。** 沒 push 的程式碼只存在你的電腦上，電腦壞掉就沒了，而且隊友也看不到。

## commit 訊息要怎麼寫

我們的規定是加一個類型前綴：

```
feat: 新增送出點餐 API          ← 新功能
fix: 修正 KDS 重複渲染          ← 修 bug
docs: 更新 API 規格             ← 改文件
refactor: 抽出購物車計算邏輯     ← 整理程式碼但功能不變
test: 補上庫存扣減的測試        ← 加測試
chore: 升級 Spring Boot 版本    ← 雜事
```

寫**你做了什麼**，不要寫「修改」「更新」「commit」這種等於沒說的話。三個月後你自己也會感謝你。

## 15 分鐘動手小練習

1. 開一個新資料夾，`cd` 進去，打 `git init`
2. 建一個 `test.txt`，隨便寫兩行字
3. `git add test.txt` → `git commit -m "feat: 第一次存檔"`
4. 改一下 `test.txt` 的內容
5. 打 `git diff` ——看看 Git 怎麼顯示「你改了哪幾行」
6. 再 commit 一次
7. 打 `git log --oneline` ——看到你的兩次存檔紀錄

看到那兩行紀錄的瞬間，你就懂 Git 在幹嘛了。

## 你會遇到的坑

**① 忘記 `git add` 就 commit**
Git 只會記錄你「放進箱子」的東西。沒 add 的檔案不會被存到。
→ commit 之前先 `git status` 看一眼。

**② 把不該傳的東西傳上去**
像 `node_modules`（幾萬個檔案）、密碼設定檔。
→ 用 `.gitignore` 檔案告訴 Git「這些不要管」。第一天就要設好。

**③ commit 訊息寫「update」**
三個月後你完全看不懂自己做了什麼。

**④ 好幾天不 commit**
一次改了 50 個檔案才 commit，出事的時候不知道是哪一步壞的。
→ **做完一件事就 commit 一次**，一天 commit 三五次很正常。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `nothing to commit, working tree clean` | 沒有東西要存 | 你沒改東西，或忘了 `git add` |
| `Please tell me who you are` | Git 不知道你是誰 | 跑一次 `git config --global user.name "你的名字"` 和 `user.email` |
| `fatal: not a git repository` | 這個資料夾不是 Git 管的 | `cd` 錯地方了，或還沒 `git init` |
| `Your branch is behind ... by N commits` | 你落後隊友 N 次存檔 | 先 `git pull` |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 存檔 | commit |
| 挑東西放進箱子 | `git add` / 暫存區（staging area） |
| 寄出去 | push |
| 收下來 | pull |
| 存檔紀錄 | commit history |
| 程式碼倉庫 | repository（repo） |
| 不要管這些檔案 | `.gitignore` |

## 自我檢核

1. 為什麼不能用「報告_最終版2.docx」這種方式管程式碼？
2. `git add` 和 `git commit` 差在哪？
3. 每天下班前一定要做什麼？為什麼？
4. commit 訊息為什麼不能寫「update」？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [連猴子都能懂的 Git 入門指南](https://backlog.com/git-tutorial/tw/intro/intro1_1.html) | **繁中** | **入門** | 60 分 |
| [Git 教學（HackMD）](https://hackmd.io/@JohnAxer/git) | 繁中 | 入門 | 30 分 |
| [新手也能懂的 Git 教學](https://medium.com/@flyotlin/%E6%96%B0%E6%89%8B%E4%B9%9F%E8%83%BD%E6%87%82%E7%9A%84git%E6%95%99%E5%AD%B8-c5dc0639dd9) | 繁中 | 入門 | 20 分 |

> **強烈建議全員都看「連猴子都能懂的 Git 入門指南」的教學 1。** 它有圖、有比喻、是繁體中文，而且真的看得懂。看完你就贏過一半的新手了。

## 相關頁面

[分支、合併與衝突](03-分支與合併.md)　[GitHub 與 Pull Request](04-GitHub與PR.md)　[命令列基本操作](01-命令列.md)
