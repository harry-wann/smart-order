# GitHub Actions CI

**難度** ★★★☆☆　**用在哪些模組** 技術地基 L0　**哪幾週** 第 2 週

## 一句話

每次有人 push 程式碼，GitHub **自動幫你編譯、跑測試**，壞了就標紅色。

## 想像一下

沒有 CI 的時候：

> **B**：我 push 了
> **D**：我 pull 下來跑不起來欸
> **B**：咦？我這邊可以啊
> **A**：（花半小時排查）你少 commit 一個檔案

**有 CI 的話**：B 一 push，GitHub 就在一台乾淨的機器上重新編譯一次。少檔案？**三分鐘後 PR 上就出現紅色叉叉**，B 自己就發現了。

CI = Continuous Integration（持續整合）。白話就是：**每次有人交東西，就自動檢查一次**。

## 怎麼設定

在專案根目錄建 `.github/workflows/ci.yml`：

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: 設定 JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: maven

      - name: 編譯與測試
        working-directory: backend
        run: ./mvnw -B verify

  frontend:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        app: [frontend-customer, frontend-admin]
    steps:
      - uses: actions/checkout@v4

      - name: 設定 Node 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
          cache-dependency-path: ${{ matrix.app }}/package-lock.json

      - name: 安裝與建置
        working-directory: ${{ matrix.app }}
        run: |
          npm ci
          npm run build
```

**commit 這個檔案，push 上去，CI 就開始運作了。** 不用註冊、不用設定伺服器、公開 repo 免費。

## 它在檢查什麼

| 檢查 | 抓到什麼問題 |
|---|---|
| `mvnw verify` | 編譯錯誤、測試失敗、少 commit 檔案 |
| `npm ci` | `package-lock.json` 跟 `package.json` 對不上 |
| `npm run build` | 前端打包錯誤、import 路徑錯（**Linux 分大小寫，Mac 不分**）|

**第三個特別有價值**：你在 Mac 上寫 `import Button from './components/button'`（小寫）可以跑，但部署到 Linux 就壞了。CI 會在 Linux 上跑，**提前幫你抓到**。

## 讓 CI 有牙齒

只跑不擋的話，大家會忽略它。到 GitHub 的 **Settings → Branches → Add rule**：

| 設定 | 效果 |
|---|---|
| Require status checks to pass | CI 沒過不能合併 |
| Require pull request reviews（1 人） | 沒人 approve 不能合併 |
| Do not allow bypassing | 連管理員也要遵守 |

**設完之後，壞掉的程式碼就進不了 `develop`。** 這對五人團隊的價值很大。

## 徽章

在 README 加一行：

```markdown
![CI](https://github.com/你的帳號/smart_order/actions/workflows/ci.yml/badge.svg)
```

README 上就會出現綠色的 `CI passing` 徽章。**面試官看 GitHub 時第一眼就看到。** 成本一行字。

## 進階：整合測試要不要放 CI

[Testcontainers](48-Testcontainers.md) 需要 Docker。GitHub 的 runner 有 Docker，所以**可以跑**，但每次要下載 MySQL 映像檔，比較慢。

建議：

```yaml
      - name: 編譯與單元測試
        run: ./mvnw -B test

      - name: 整合測試（只在 develop 分支跑）
        if: github.ref == 'refs/heads/develop'
        run: ./mvnw -B verify -Pintegration
```

## 15 分鐘動手小練習

1. 在任何一個練習專案裡建 `.github/workflows/ci.yml`，貼上最小版本：

```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { java-version: '17', distribution: 'temurin' }
      - run: ./mvnw -B verify
```

2. push 上去
3. 去 GitHub 的 **Actions** 分頁，看它跑
4. **故意寫一行編譯不過的程式碼，push** → 看它變紅色叉叉
5. 點進去看錯誤訊息

第 4 步是重點，讓全隊知道紅色叉叉長什麼樣、代表什麼。

## 你會遇到的坑

**① YAML 縮排錯**
YAML 對縮排極度敏感，而且**只能用空格不能用 Tab**。

**② `mvnw` 沒有執行權限**
```
Permission denied: ./mvnw
```
→ `git update-index --chmod=+x mvnw` 然後 commit。

**③ 本機過但 CI 失敗**
最常見的原因：
- **檔名大小寫**（Mac 不分、Linux 分）
- 少 commit 了檔案
- 依賴版本不一致

**這些正是 CI 存在的價值。**

**④ 沒開分支保護**
CI 紅了大家還是照樣合併。

**⑤ CI 跑太久**
超過 5 分鐘就沒人想等。
→ 加快取（`cache: maven` / `cache: npm`），整合測試分開跑。

**⑥ 把密鑰寫在 yml 裡**
→ 用 GitHub 的 **Settings → Secrets**，在 yml 裡用 `${{ secrets.XXX }}`。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `Permission denied: ./mvnw` | 沒執行權限 | `git update-index --chmod=+x mvnw` |
| `npm ci can only install with an existing package-lock.json` | 沒 commit lock 檔 | commit 它 |
| `Module not found: Can't resolve './Button'` | 大小寫錯 | 改成正確的大小寫 |
| `Process completed with exit code 1` | 某一步失敗了 | 展開該步驟看真正的錯誤 |
| `The workflow is not valid` | YAML 語法錯 | 檢查縮排、用線上 YAML 檢查器 |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 每次交東西自動檢查 | CI（Continuous Integration 持續整合） |
| 自動部署 | CD（Continuous Delivery/Deployment） |
| 一套自動流程 | workflow |
| 流程裡的一個任務 | job |
| 任務裡的一步 | step |
| 跑流程的機器 | runner |
| 沒過不准合併 | Branch Protection |

## 自我檢核

1. CI 解決了團隊的什麼問題？
2. 「本機可以跑但 CI 失敗」最常見的原因是什麼？
3. 怎麼讓 CI「有牙齒」？
4. 密鑰應該放在哪裡？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [GitHub Actions 官方文件（繁中）](https://docs.github.com/zh/actions/get-started/quickstart) | 繁中 | 入門 | 20 分 |
| [GitHub Actions 入門（iThome）](https://ithelp.ithome.com.tw/articles/10263776) | 繁中 | 入門 | 20 分 |

## 相關頁面

[GitHub 與 Pull Request](../team/04-GitHub與PR.md)　[單元測試](47-單元測試.md)　[部署上線](50-部署上線.md)
