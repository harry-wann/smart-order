-- 已有資料庫才需要；新建的資料庫直接跑 schema.sql 就有這個欄位，不用跑這份。
-- 出菜看板的「報廢／退菜」（M4 4.9）：order_item 加 wasted_at，分辨這筆 CANCELLED 是報廢（做壞或客人退回、庫存不回補）
-- 還是一般取消（未出餐、庫存回補）。只新增一個可為 NULL 的欄位，不刪也不改任何舊資料；
-- 舊的 CANCELLED 品項 wasted_at 都是 NULL，照舊算一般取消。
-- 新版後端會讀 wasted_at（出菜看板報廢、顧客端出餐進度），所以要「先跑這份、再啟動新版後端」。
-- 欄位已經存在就略過，重跑也不會出錯。
--
-- 先檢查（Preflight）：還沒升級過的話，下面這句查不到任何列
-- SHOW COLUMNS FROM order_item LIKE 'wasted_at';

SET NAMES utf8mb4;

SET @add_wasted_at = (SELECT IF(COUNT(*) = 0,
                                'ALTER TABLE order_item ADD COLUMN wasted_at DATETIME(3) NULL COMMENT ''報廢（退菜）時間；有值代表這筆 CANCELLED 是報廢、庫存不回補，NULL 是一般取消'' AFTER served_at',
                                'DO 0')
                        FROM information_schema.columns
                       WHERE table_schema = DATABASE() AND table_name = 'order_item' AND column_name = 'wasted_at');
PREPARE add_wasted_at_stmt FROM @add_wasted_at;
EXECUTE add_wasted_at_stmt;
DEALLOCATE PREPARE add_wasted_at_stmt;
