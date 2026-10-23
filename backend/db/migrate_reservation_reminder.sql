-- 已有資料庫才需要；新建的資料庫直接跑 schema.sql 就是新結構，不用跑這份。
-- 訂位提醒（M7 7.12，模擬簡訊）要記「這筆提醒過了沒」：reservation 新增 reminder_sent_at，
-- 排程與手動 API 靠它做到同一筆只提醒一次。只加一個可為 NULL 的欄位，不刪也不改任何舊資料，
-- 也不補填舊訂位：NULL 就是還沒提醒，升級後第一次跑提醒時，開始時間在「現在～現在 + 2 小時」內的訂位會被提醒一次。
-- 新版後端會讀 reminder_sent_at，所以要「先跑這份、再啟動新版後端」，欄位不在新版會直接出錯。
-- MySQL 的 DDL 逐句提交，這份只有一句，失敗就是沒加成功；跑之前先確認欄位還不存在，已經有就不用再跑。
--
-- 先檢查（Preflight）：下面這句應該查不到任何列
-- SHOW COLUMNS FROM reservation LIKE 'reminder_sent_at';

ALTER TABLE reservation
  ADD COLUMN reminder_sent_at DATETIME(3) NULL
  COMMENT '訂位提醒（模擬簡訊）送出的時間；NULL = 還沒提醒。只由條件式 UPDATE（WHERE reminder_sent_at IS NULL）寫入，同一筆只提醒一次'
  AFTER cancel_source;
