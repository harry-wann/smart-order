-- 已有資料庫才需要；新建的資料庫直接跑 schema.sql 就是新結構，不用跑這份。
-- 同桌 guest 改用伺服器簽發的 X-Guest-Token：新增 guest_token_hash，拿掉 (dining_session_id, device_id) 唯一索引，
-- device_id 改成可為 NULL。只加欄位、換索引、放寬 NULL，不刪也不改任何舊資料。
-- 新版後端會讀 guest_token_hash，所以要「先跑這份、再啟動新版後端」。
-- MySQL 的 DDL 每句各自提交，中途失敗時先看是哪一句，只補跑還沒成功的句子，不要整份重跑。
--
-- 先檢查（Preflight）：
-- 1. 還沒升級過：下面這句應該查不到任何列
-- SHOW COLUMNS FROM dining_session_guest LIKE 'guest_token_hash';
-- 2. 舊的唯一索引還在：下面這句應該查到 uk_guest_session_device
-- SHOW INDEX FROM dining_session_guest WHERE Key_name = 'uk_guest_session_device';
-- 3. 目前用餐中的 guest：舊 guest 沒有 guest token，升級後那些手機要重新掃碼，會變成新的 guest，
--    之前加進購物車、還沒送出的品項仍掛在舊 guest 名下（同桌看得到，但新 guest 不能改或送出）。
--    建議在沒有用餐中桌次時升級；這句查到 0 最理想。
-- SELECT COUNT(*) FROM dining_session_guest g
--   JOIN dining_session s ON s.id = g.dining_session_id
--   WHERE s.status = 'OPEN';

ALTER TABLE dining_session_guest
  ADD COLUMN guest_token_hash CHAR(64) NULL
  COMMENT 'X-Guest-Token 的 SHA-256 十六進位雜湊（原始值不存）；舊資料為 NULL'
  AFTER device_id;

-- 多筆 NULL 不算重複，舊資料不會擋住唯一索引
ALTER TABLE dining_session_guest ADD UNIQUE KEY uk_guest_token_hash (guest_token_hash);

-- 先建一般索引再拿掉舊的唯一索引：外鍵 fk_guest_session 需要以 dining_session_id 開頭的索引，
-- 順序反過來 MySQL 會拒絕刪除
ALTER TABLE dining_session_guest ADD KEY idx_guest_session_device (dining_session_id, device_id);
ALTER TABLE dining_session_guest DROP INDEX uk_guest_session_device;

-- 新手機即使帶相同 X-Device-Id 也會建立新 guest，而且 X-Device-Id 改成選填
ALTER TABLE dining_session_guest
  MODIFY device_id VARCHAR(36) NULL
  COMMENT '前端帶的 X-Device-Id，可偽造；只供顯示／診斷，不參與 guest 查找或身分判斷';
