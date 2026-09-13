# Docker 與 Docker Compose

**難度** ★★★☆☆　**用在哪些模組** 全員（環境建置）　**哪幾週** 第 1 週

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

我們的專案需要好幾個箱子：MySQL、Redis，也許還有 RabbitMQ。

如果每個都要自己打一長串指令很麻煩。**Docker Compose 就是一張清單**，寫好「我要哪幾個箱子、各自怎麼設定」，然後一個指令全部開起來。

我們的 `docker-compose.yml` 大概長這樣：

```yaml
services:
  mysql:
    image: mysql:8.0                    # 我要 MySQL 8.0 這個箱子
    environment:
      MYSQL_ROOT_PASSWORD: root         # 密碼設成 root
      MYSQL_DATABASE: smart_order       # 幫我建一個叫 smart_order 的資料庫
    ports:
      - "3306:3306"                     # 箱子裡的 3306 接到我電腦的 3306
    volumes:
      - mysql-data:/var/lib/mysql       # 資料存在外面，箱子關掉也不會不見

  redis:
    image: redis:7
    ports:
      - "6379:6379"

volumes:
  mysql-data:
```

## 你只需要會這四個指令

```bash
docker compose up -d        # 全部開起來（-d 是在背景跑）
docker compose ps           # 看現在有哪些在跑
docker compose logs mysql   # 看 MySQL 說了什麼（出事時用）
docker compose down         # 全部關掉
```

**真的就這四個。** `docker-compose.yml` 屬於技術地基，由一個人寫好，其他人只要會 `up` 和 `down`。

## 在我們的專案裡

第一天環境建置，每個人只要：

```bash
cd smart_order
docker compose up -d        # MySQL 和 Redis 就跑起來了
```

不用裝 MySQL、不用設定、不用擔心版本。這一步能省掉你們**至少半天**的集體卡關時間。

## 15 分鐘動手小練習

1. 去官網裝 Docker Desktop
2. 開一個空資料夾，建一個 `docker-compose.yml`，貼上上面 MySQL 那段
3. 打 `docker compose up -d`
4. 打 `docker compose ps`，看到 mysql 的狀態是 running
5. 用 MySQL Workbench 或 DBeaver 連 `localhost:3306`，帳號 `root` 密碼 `root`
6. 連上了就成功了
7. 打 `docker compose down` 關掉

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
| `Access denied for user 'root'` | 密碼錯 | 檢查 yml 的密碼跟程式的設定是否一致 |

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
