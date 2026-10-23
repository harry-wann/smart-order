-- 已有資料庫才需要；新建的資料庫直接跑 schema.sql 就是新結構，不用跑這份。
-- 出菜看板的報廢／退菜要記下是哪位員工操作的：order_item 加 wasted_by_staff_id，外鍵指向 staff(id)。
-- 只新增一個可為 NULL 的欄位與它的外鍵，不改任何舊資料：升級前就報廢的品項不知道是誰報的，維持 NULL；
-- 一般取消、沒報廢的品項本來就是 NULL。
-- 新版後端報廢時會寫這個欄位，所以要「先跑這份、再啟動新版後端」（欄位不在，報廢會直接出錯）。
-- 新欄位接在 wasted_at 後面，所以要先跑過 migrate_order_item_waste.sql。
--
-- 整份可以重複執行：欄位、外鍵各自用 information_schema 判斷，已經存在就略過。
-- MySQL 的 DDL 每句各自提交；萬一加欄位成功、加外鍵失敗，修好原因後整份再跑一次，會略過欄位、接著加外鍵。
--
-- 先檢查（Preflight）：
-- 1. 還沒加欄位的話，下面這句查不到任何列
-- SHOW COLUMNS FROM order_item LIKE 'wasted_by_staff_id';
-- 2. 還沒加外鍵的話，下面這句查到 0
-- SELECT COUNT(*) FROM information_schema.table_constraints
--  WHERE table_schema = DATABASE() AND table_name = 'order_item'
--    AND constraint_name = 'fk_order_item_wasted_staff' AND constraint_type = 'FOREIGN KEY';
-- 3. 已經先跑過 migrate_order_item_waste.sql：下面這句要查到一列
-- SHOW COLUMNS FROM order_item LIKE 'wasted_at';

SET NAMES utf8mb4;

-- ── 1. 加 wasted_by_staff_id ────────────────────────────────────────────────

SET @add_wasted_by_staff_id = (SELECT IF(COUNT(*) = 0,
                                         'ALTER TABLE order_item ADD COLUMN wasted_by_staff_id BIGINT UNSIGNED NULL COMMENT ''報廢（退菜）的員工；只有報廢才有值，一般取消與升級前的舊報廢為 NULL'' AFTER wasted_at',
                                         'DO 0')
                                 FROM information_schema.columns
                                WHERE table_schema = DATABASE() AND table_name = 'order_item'
                                  AND column_name = 'wasted_by_staff_id');
PREPARE add_wasted_by_staff_id_stmt FROM @add_wasted_by_staff_id;
EXECUTE add_wasted_by_staff_id_stmt;
DEALLOCATE PREPARE add_wasted_by_staff_id_stmt;

-- ── 2. 加外鍵 → staff(id) ──────────────────────────────────────────────────
-- 剛加的欄位都是 NULL（NULL 不受外鍵檢查），不會有對不到員工的值擋住外鍵。
-- 欄位上沒有其他索引，MySQL 加外鍵時會自動建一個同名索引（跟 schema.sql 建表時一樣）

SET @add_wasted_staff_fk = (SELECT IF(COUNT(*) = 0,
                                      'ALTER TABLE order_item ADD CONSTRAINT fk_order_item_wasted_staff FOREIGN KEY (wasted_by_staff_id) REFERENCES staff (id)',
                                      'DO 0')
                              FROM information_schema.table_constraints
                             WHERE table_schema = DATABASE() AND table_name = 'order_item'
                               AND constraint_name = 'fk_order_item_wasted_staff' AND constraint_type = 'FOREIGN KEY');
PREPARE add_wasted_staff_fk_stmt FROM @add_wasted_staff_fk;
EXECUTE add_wasted_staff_fk_stmt;
DEALLOCATE PREPARE add_wasted_staff_fk_stmt;
