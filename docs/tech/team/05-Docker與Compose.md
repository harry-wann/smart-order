# Docker 與 Docker Compose

**難度** ★★★☆☆　**用在哪些模組** 全員（環境建置）　**哪幾週** 第 1 週（L0）

> 本頁解釋 Docker 名詞；實際啟動請照 [後端環境建置](../../spring-boot/README.md) 的順序操作。目前 `backend/compose.yaml` 只有 MySQL 5.7 與 phpMyAdmin，Redis 是之後的功能規劃。

## 一句話

Docker 就是**把整個環境裝進一個箱子**，箱子在誰的電腦上打開都長一樣。

## 想像一下

你們五個人要裝 MySQL。結果：

- A 是 Mac，裝了 MySQL 8.0
- B 是 Windows，裝成 MySQL 5.7
- C 裝的時候編碼設錯，中文全變問號
- D 的電腦上早就有另一個 MySQL 在跑，埠號打架
- E 裝到一半卡住，花了一整個下午

然後就會出現那句經典台詞：**「可是在我電腦上是好的啊。」**

**Docker 解決的就是這件事。** 有人（MySQL 官方）把「裝好、設定好的 MySQL」打包成一個箱子放在網路上。你只要說「給我那個箱子」，箱子在你電腦上打開，就是一模一樣的環境。版本一樣、設定一樣、編碼一樣。

## 兩個名詞

| 白話 | 名稱 | 比喻 |
|---|---|---|
| 箱子的設計圖 | **映像檔** image | 蛋糕食譜 |
| 真的跑起來的箱子 | **容器** container | 照食譜做出來的蛋糕 |

一張設計圖可以開出很多個箱子。

## Docker Compose 是什麼

專案目前用兩個容器：MySQL 和 phpMyAdmin。日後若加入 Redis 或 RabbitMQ，也可以寫在同一份 Compose 設定裡。

如果每個都要自己打一長串指令很麻煩。**Docker Compose 就是一張清單**，寫好「我要哪幾個箱子、各自怎麼設定」，然後一個指令全部開起來。

目前的設定檔叫 `backend/compose.yaml`。下面只節錄關鍵欄位，完整版本請看該檔案：

```yaml
services:
  mysql:
    image: mysql:5.7.44                 # 團隊統一的 MySQL 版本
    platform: linux/amd64
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    ports:
      - "3306:3306"                     # 箱子裡的 3306 接到我電腦的 3306
    volumes:
      - mysql57_data:/var/lib/mysql     # 容器關掉後，資料仍留在 volume

  phpmyadmin:
    image: phpmyadmin:5.2.3-apache
    ports:
      - "80:80"

volumes:
  mysql57_data:
```

`${...}` 表示 Compose 從 `backend/.env` 讀取值；第一次執行 `docker compose up` 前必須先建立並編輯 `.env`。`MYSQL_USER` 是 Spring Boot 使用的一般帳號，和 root 管理員分開。

## 你只需要會這四個指令

```bash
docker compose up -d        # 全部開起來（-d 是在背景跑）
docker compose ps           # 看現在有哪些在跑
docker compose logs mysql   # 看 MySQL 說了什麼（出事時用）
docker compose down         # 全部關掉
```

指令請在 `backend/` 執行，Compose 才能找到 `compose.yaml` 與 `.env`。`docker compose down` 會停止並移除容器，資料卷仍保留；不要加會刪除資料卷的選項。

## 在我們的專案裡

第一天環境建置，每個人只要：

```bash
cd backend                  # 從 repository 根目錄進入
cp .env.example .env        # 第一次才做；先編輯密碼
docker compose up -d        # MySQL 和 phpMyAdmin 啟動
docker compose ps           # 確認 mysql 顯示 healthy
```

不用裝 MySQL、不用設定、不用擔心版本。這一步能省掉你們**至少半天**的集體卡關時間。

## 15 分鐘動手小練習

1. 依 [後端環境建置](../../spring-boot/README.md) 建立 `backend/.env`，換掉範例密碼。
2. 在 `backend/` 執行 `docker compose up -d`、`docker compose ps`。
3. 確認 `mysql` healthy，瀏覽 `http://localhost/` 打開 phpMyAdmin。
4. 用 `.env` 中的 MySQL 帳號登入，確認 `northwind` 資料庫存在。
5. 練習結束可執行 `docker compose down`；下次 `up -d` 時資料卷仍在。

## 你會遇到的坑

**① 埠號被佔用**
你電腦上本來就有 MySQL 在跑，3306 被佔走了。
→ 改成 `"3307:3306"`（我的電腦用 3307，箱子裡還是 3306），程式連線字串也要跟著改。

**② 忘記 `volumes`，資料全沒了**
`docker compose down` 之後箱子消失，裡面的資料也消失。
→ 一定要設 `volumes`，資料才會存在箱子外面。

**③ Docker Desktop 沒開**
指令會噴 `Cannot connect to the Docker daemon`。
→ 先確認工作列上的鯨魚圖示是亮的。

**④ 改了 yml 沒重開**
改設定要 `docker compose down` 再 `up -d`。

**⑤ Mac M 系列晶片的映像檔問題**
少數映像檔沒有 ARM 版本。
→ 在該服務下加 `platform: linux/amd64`。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `Cannot connect to the Docker daemon` | Docker 沒在跑 | 打開 Docker Desktop |
| `port is already allocated` | 埠號被佔走了 | 改 ports 設定，或關掉佔用的程式 |
| `no matching manifest for linux/arm64` | 這箱子沒有 M 晶片版本 | 加 `platform: linux/amd64` |
| `Access denied for user` | 帳密與已初始化的資料庫不一致 | 檢查 `.env` 與初始化時的設定；修改 `.env` 不會自動修改既有 MySQL 使用者密碼 |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 箱子的設計圖 | image 映像檔 |
| 跑起來的箱子 | container 容器 |
| 一張清單同時開好幾個箱子 | Docker Compose |
| 箱子裡的門對到我電腦的哪個門 | port mapping 埠號對應 |
| 資料存在箱子外面 | volume 資料卷 |

## 自我檢核

1. 「可是在我電腦上是好的啊」這個問題，Docker 怎麼解決？
2. image 和 container 差在哪？
3. 為什麼一定要設 `volumes`？
4. `docker compose down` 之後，資料還在嗎？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [Docker 基礎教學與介紹 101](https://cwhu.medium.com/docker-tutorial-101-c3808b899ac6) | 繁中 | 入門 | 25 分 |
| [Docker Container 基礎入門篇](https://azole.medium.com/docker-container-%E5%9F%BA%E7%A4%8E%E5%85%A5%E9%96%80%E7%AF%87-1-3cb8876f2b14) | 繁中 | 入門 | 30 分 |
| [《Docker — 從入門到實踐》正體中文版](https://philipzheng.gitbook.io/docker_practice) | 繁中 | 入門～進階 | 查用 |

> 除了負責技術地基的人，其他人**只要看完第一篇**就夠了。你們只需要會 `up` 和 `down`。

## 相關頁面

[命令列基本操作](01-命令列.md)　[關聯式資料庫與 SQL](../database/22-關聯式資料庫與SQL.md)　[Redis](../realtime/44-Redis.md)　[部署上線](../quality/50-部署上線.md)
