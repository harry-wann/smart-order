-- 已有資料庫才需要；新建的資料庫直接跑 schema.sql 就是新結構，不用跑這份。整份可以重複執行。
--
-- 做什麼：order_item 加 stock_deducted，記「這筆送單時有沒有扣庫存」。
-- 為什麼：取消未出餐的品項時，舊版後端看品項「現在」的 track_inventory 決定要不要把庫存加回去。
-- 店長在送單後切換追蹤，就會補錯：
--   ・原本不追蹤（沒扣），後來改成追蹤再取消 → 多補，庫存憑空變多
--   ・原本追蹤（有扣），後來改成不追蹤再取消 → 漏補，扣掉的份數回不來
-- 新版後端送單時把「有沒有扣」寫進 stock_deducted，取消時只補 stock_deducted = 1 的列。
--
-- 舊資料的回填是「推測」，不是當時的真實紀錄：
--   舊單送出時沒有記下有沒有扣庫存，事後已經查不到。舊版送單是依「當時」的 track_inventory 決定扣不扣，
--   店長沒切換過的品項，現在的值就等於當時的值，所以用品項「現在」的 track_inventory 當最佳推測。
--   送單後才切換過的品項會猜錯；只有還沒出餐（PENDING／PREPARING）、之後還可能被取消的列才會受影響，
--   已出餐、已取消、已結帳的列不會再補庫存，猜錯也沒有影響。擔心的話先看下面第 2 句檢查查詢。
--
-- 回填只會發生一次，重跑不會覆蓋：
--   1. 欄位不存在才新增，先加成「可為 NULL」，舊資料全部是 NULL（代表還沒回填）
--   2. 只回填 stock_deducted IS NULL 的列
--   3. 欄位還可為 NULL 才改成 NOT NULL DEFAULT 0（跟 schema.sql 一致）
--   第一次跑完欄位就是 NOT NULL、沒有 NULL 的列，之後重跑三步都不會改到任何東西。
--   第一次跑到一半中斷（例如加完欄位就斷線）也沒關係：再跑一次會從還是 NULL 的列接著回填，不會漏。
--
-- 執行時機：先停掉舊版後端，跑這份，再啟動新版後端。
--   新版送單會寫 stock_deducted、取消會讀它，欄位不在會直接出錯；
--   舊版不知道這個欄位，升級後還在跑的話，它送的單會被記成「沒扣」（預設 0），取消時就不會補庫存。
--
-- 先檢查（Preflight）：
-- 1. 還沒加欄位的話，下面這句查不到任何列
-- SHOW COLUMNS FROM order_item LIKE 'stock_deducted';
-- 2. 用餐中還沒出餐（之後還可能被取消）的品項，以及回填會推測成什麼（1 = 有扣，取消會補回）
-- SELECT oi.id, oi.order_ticket_id, oi.item_name_snapshot, oi.quantity, oi.status, mi.track_inventory AS will_be_stock_deducted
--   FROM order_item oi
--   JOIN order_ticket ot ON ot.id = oi.order_ticket_id
--   JOIN dining_session ds ON ds.id = ot.dining_session_id
--   JOIN menu_item mi ON mi.id = oi.menu_item_id
--  WHERE ds.status = 'OPEN' AND oi.status IN ('PENDING', 'PREPARING');

SET NAMES utf8mb4;

-- ── 1. 加 stock_deducted（先可為 NULL）─────────────────────────────────────

SET @add_stock_deducted = (SELECT IF(COUNT(*) = 0,
                                     'ALTER TABLE order_item ADD COLUMN stock_deducted TINYINT(1) NULL COMMENT ''送單時是否扣了庫存；取消時依此決定要不要補回，不看品項現在的 track_inventory'' AFTER quantity',
                                     'DO 0')
                             FROM information_schema.columns
                            WHERE table_schema = DATABASE() AND table_name = 'order_item' AND column_name = 'stock_deducted');
PREPARE add_stock_deducted_stmt FROM @add_stock_deducted;
EXECUTE add_stock_deducted_stmt;
DEALLOCATE PREPARE add_stock_deducted_stmt;

-- ── 2. 回填舊資料（推測：用品項現在的 track_inventory）────────────────────

-- 只填還是 NULL 的列，也就是剛加上欄位、還沒回填的舊資料；欄位改成 NOT NULL 之後就沒有 NULL，重跑不會改到任何列
UPDATE order_item oi
JOIN menu_item mi ON mi.id = oi.menu_item_id
SET oi.stock_deducted = mi.track_inventory
WHERE oi.stock_deducted IS NULL;

-- ── 3. 改成 NOT NULL DEFAULT 0 ─────────────────────────────────────────────

SET @finish_stock_deducted = (SELECT IF(COUNT(*) = 1,
                                        'ALTER TABLE order_item MODIFY COLUMN stock_deducted TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''送單時是否扣了庫存；取消時依此決定要不要補回，不看品項現在的 track_inventory''',
                                        'DO 0')
                                FROM information_schema.columns
                               WHERE table_schema = DATABASE() AND table_name = 'order_item'
                                 AND column_name = 'stock_deducted' AND is_nullable = 'YES');
PREPARE finish_stock_deducted_stmt FROM @finish_stock_deducted;
EXECUTE finish_stock_deducted_stmt;
DEALLOCATE PREPARE finish_stock_deducted_stmt;
