-- 已有資料庫才需要；新建的資料庫直接跑 schema.sql 就是新結構，不用跑這份。
-- 線上付款記錄是哪位同桌 guest 發起的：同桌別人正在付款時擋下，只有發起人能作廢自己的待確認付款。
-- 只加一個可為 NULL 的欄位，不改舊資料；舊的待確認付款 created_by_guest_id 是 NULL，
-- 會被當成「別人發起」，超過 15 分鐘後才能由同桌其他人接手。
-- 新版後端會讀這個欄位，所以要「先跑這份、再啟動新版後端」。
--
-- 先檢查（Preflight）：還沒升級過，下面這句應該查不到任何列
-- SHOW COLUMNS FROM payment LIKE 'created_by_guest_id';

ALTER TABLE payment
  ADD COLUMN created_by_guest_id BIGINT UNSIGNED NULL
  COMMENT '發起線上付款的同桌 guest；櫃檯結清為 NULL'
  AFTER transaction_no;
