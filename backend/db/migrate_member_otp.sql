-- 已有資料庫用的一次性升級：會員驗證碼的每手機鎖（驗證碼限流與驗證排隊用，見 MemberAuthService）。
-- 全新建置直接跑 schema.sql 就有這張表，不用跑這份。
-- 先跑這份，再啟動新版後端；新版要驗證碼、驗證都會用到這張表，沒有這張表會直接失敗。
-- 不刪、不改任何既有資料；CREATE TABLE IF NOT EXISTS 和 INSERT IGNORE 讓這份重跑也不會出錯。

CREATE TABLE IF NOT EXISTS verification_phone_lock (
  phone             VARCHAR(20)     NOT NULL,
  last_requested_at DATETIME(3)     NOT NULL COMMENT '最後一次要驗證碼的時間',
  PRIMARY KEY (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='手機驗證碼的每手機鎖';

-- 升級前就要過驗證碼的手機先補一列。新版驗證時找不到這一列會當成「還沒要過驗證碼」，
-- 不補的話，升級當下剛收到、還在 5 分鐘效期內的驗證碼會不能用
INSERT IGNORE INTO verification_phone_lock (phone, last_requested_at)
SELECT phone, MAX(created_at) FROM verification_code GROUP BY phone;
