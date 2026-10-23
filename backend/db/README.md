# smartorder 資料表與假資料

基礎版用到的資料表與一套可以直接 demo 的假資料。欄位定義以 [`docs/spec/03-資料庫設計.md`](../../docs/spec/03-資料庫設計.md) 為準。

| 檔案 | 內容 |
|---|---|
| `schema.sql` | 建 22 張資料表（**會先刪掉同名的表**） |
| `seed.sql` | 假資料（**會先清空所有表**再寫入） |
| `generate_seed.py` | 產生 `seed.sql` 的程式；要改假資料改這支，再重新產生 |
| `migrate_waitlist_flow.sql` | 已有資料庫的一次性候位約束／序號升級，不重編舊號 |
| `migrate_guest_token.sql` | 已有資料庫的一次性同桌 guest token 升級（新增 `guest_token_hash`、拿掉裝置唯一索引），不改舊資料 |
| `migrate_member_otp.sql` | 已有資料庫的一次性會員驗證碼升級：加上每支手機一列的鎖（`verification_phone_lock`） |
| `migrate_reservation_reminder.sql` | 已有資料庫的一次性訂位提醒升級：`reservation` 新增 `reminder_sent_at`（記錄模擬簡訊提醒送出的時間，同一筆只提醒一次） |
| `migrate_order_item_waste.sql` | 已有資料庫的一次性出菜看板報廢升級：`order_item` 加上 `wasted_at`（報廢／退菜時間），不改舊資料 |

進階功能（服務鈴、庫存異動紀錄、預先點餐、點數與優惠券）的表與欄位不在這裡，做到時再加。

已有資料庫若只升級候位流程，先停止候位登記與入座寫入，檢查 `migrate_waitlist_flow.sql` 開頭的重複號碼／重複候位 session 查詢，再執行該檔一次。MySQL DDL 逐句提交；若唯一索引因歷史重複而失敗，應先人工審查資料，不能自動刪除或重編歷史。舊的已過號列無法推回真實過號時間，`expired_at` 會維持 `NULL`；升級後的過號會記錄實際標記時間。

已有資料庫若要升級同桌 guest token，**先執行 `migrate_guest_token.sql` 一次，再啟動新版後端**（新版會讀 `guest_token_hash`，欄位不在會直接出錯）。先看檔案開頭的檢查查詢：最好在沒有用餐中桌次時升級；升級前就加入的 guest 沒有 token（`guest_token_hash` 為 `NULL`），那些手機要重新掃碼、會變成新的 guest。腳本只新增欄位、換索引、把 `device_id` 放寬成可為 `NULL`，不刪也不改舊資料。`seed.sql` 的 guest 也一樣沒有 token，重跑假資料後要用手機掃碼加入才會拿到。

已有資料庫要升級會員驗證碼（同一支手機 10 分鐘最多要 3 次、錯 3 次作廢在同時送出時也算得對），請先停止舊版後端，再執行 `migrate_member_otp.sql`，然後啟動新版後端（舊後端在升級期間發出的驗證碼不會登記到鎖表，新後端會要求重新取得）。這份檔案可以重複執行，啟動前再跑一次也沒問題。
它只新增 `verification_phone_lock` 一張表，並替升級前要過驗證碼的手機各補一列，不刪也不改既有資料，重跑也沒關係。

已有資料庫要升級訂位提醒（M7 7.12，模擬簡訊），**先執行 `migrate_reservation_reminder.sql` 一次，再啟動新版後端**（新版會讀 `reservation.reminder_sent_at`，欄位不在會直接出錯）。腳本只對 `reservation` 新增一個可為 `NULL` 的欄位，不刪也不改任何舊資料，也不替舊訂位補填：`NULL` 代表還沒提醒，升級後第一次跑提醒時，開始時間在「現在～現在 + 2 小時」內、狀態還是 `CONFIRMED` 的訂位會被提醒一次。這份是一句 `ALTER TABLE`，**不能重複執行**（欄位已存在會報錯），先照檔案開頭的檢查查詢確認欄位還不存在。

已有資料庫要升級出菜看板的報廢（退菜）功能，**先執行 `migrate_order_item_waste.sql`，再啟動新版後端**（新版的出菜看板報廢與顧客端出餐進度會讀 `order_item.wasted_at`，欄位不在會直接出錯）。
它只替 `order_item` 新增可為 `NULL` 的 `wasted_at`，不刪也不改既有資料：舊的 `CANCELLED` 品項維持 `NULL`，照舊算一般取消；欄位已經存在就略過，重跑也沒關係。`seed.sql` 不用重跑。

## 匯入

先建好資料庫 `smartorder`（`utf8mb4`），**依序**執行 `schema.sql`、`seed.sql`。MySQL 8.0 與 5.7（團隊 compose 用的版本）都測過。

**命令列**

```bash
mysql -h 127.0.0.1 -P 3306 -u <帳號> -p --default-character-set=utf8mb4 smartorder < backend/db/schema.sql
mysql -h 127.0.0.1 -P 3306 -u <帳號> -p --default-character-set=utf8mb4 smartorder < backend/db/seed.sql
```

**Docker Compose（`backend/compose.yaml` 起的 MySQL）**

```bash
docker compose -f backend/compose.yaml exec -T mysql mysql -u<帳號> -p<密碼> --default-character-set=utf8mb4 smartorder < backend/db/schema.sql
docker compose -f backend/compose.yaml exec -T mysql mysql -u<帳號> -p<密碼> --default-character-set=utf8mb4 smartorder < backend/db/seed.sql
```

**phpMyAdmin**：左側點 `smartorder` → 上方「匯入」→ 選 `schema.sql` 執行，再選 `seed.sql` 執行。

## 重置成初始狀態

`seed.sql` 可以單獨重跑：會清空所有表再寫入，時間又以執行當下為準。
**demo 前重跑一次**，桌況、訂位、候位就回到初始狀態。表結構有改才需要重跑 `schema.sql`。

會隨時間變化的兩段：已叫號的候位（A12、A13）叫號 10 分鐘後會被過號排程標成過號；
三筆預約保留過了訂位時間 10 分鐘就解除。要 demo 這兩段，重跑後 5 分鐘內進行。

訂位提醒（模擬簡訊）：提醒時間（開始前 2 小時）已經過的今天訂位與歷史訂位，假資料已預先標成「已提醒」；
只有 A04 的訂位（約 2 小時後）還沒提醒，重跑後手動觸發 `POST /api/admin/scheduler/send-reminders` 會回新提醒 1 筆，
店家端訂位管理那一列就出現「已提醒」小字；再按一次回 0（15 分鐘整點的排程若先跑了，這筆就已經被它提醒，手動觸發會回 0）。
明天起的訂位要等到開始前 2 小時才會被提醒到。

## 假資料裡有什麼

時間都以「執行 `seed.sql` 當下的台灣時間」為準（不受資料庫伺服器時區影響），所以哪一天匯入都有「現在」的狀況可以看。

**帳號**

| 帳號 | 密碼 | 角色 | 顯示名稱 |
|---|---|---|---|
| `manager` | `1234` | MANAGER | 王店長 |
| `counter` | `1234` | COUNTER | 小美 |
| `kai` | `1234` | COUNTER | 阿凱 |
| `kitchen` | `1234` | KITCHEN | 廚房 1 號機 |

會員用手機登入，示範帳號是陳小美 `0912345678`（我的預約：即將到來 3、已完成 8、已取消 2）。

**菜單**：8 個分類、64 個品項（4 種鍋底含鴛鴦、3 個免費續加品）、6 個選項群組。
紐西蘭小羔羊肩、澳洲和牛 M9、北海道干貝售完；美國老饕牛小排低量；霜降牛舌下架。

**桌位**：18 張、76 個座位、13 張開放線上訂位，區域 A 區・窗邊／A 區・走道／B 區／C 包廂。

**現在的店裡**

| 桌 | 狀況 |
|---|---|
| A03 | 用餐中 47 分鐘，示範桌：3 位同桌客人（陳小美、客人 2、王大明）、購物車還有 3 項、第 2 單剛送出 |
| A02 | 用餐中，由訂位報到 |
| B01 | 用餐中 112 分鐘（超過 100 分鐘），有一道退掉的菜 |
| B03 | 用餐中，由候位 A11 報到；第 1 單已等 16 分鐘（出菜看板久候） |
| C01 | 用餐中，由訂位報到；有一張櫃檯代客加點 |
| A05、A07 | 剛結帳，待清理 |
| A08、B02、B04 | 30 分鐘內有訂位，顯示預約保留 |
| A06 | 約 1 小時後有訂位（開桌會跳強烈提醒） |
| A01 | 有一筆過了訂位時間 15 分鐘還沒來的訂位 |

**訂位**：今天 11 筆（含兩筆已取消，其中一筆是櫃檯代客取消）、明天起 30 筆、過去約 55 天的已完成／逾時未到／已取消紀錄。
**候位**：A10 過號、A11 已入座、A12／A13 已叫號、A14 等待中。

## 改假資料

```bash
python3 backend/db/generate_seed.py   # 重新產生 seed.sql
```

亂數固定種子，重跑結果相同。不要直接改 `seed.sql`，下次產生會被蓋掉。
