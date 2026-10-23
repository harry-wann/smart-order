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
--   送單後才切換過的品項會猜錯；受影響的是用餐中、還沒取消的列（已出餐的也可能被出菜看板撤回出餐、再一般取消），
--   已取消、已結帳的列不會再補庫存，猜錯也沒有影響。擔心的話先看下面第 2 句檢查查詢。
--
-- 回填只會發生一次，重跑不會覆蓋：
--   1. 欄位不存在才新增，先加成「可為 NULL」，舊資料全部是 NULL（代表還沒回填）
--   2. 只回填 stock_deducted IS NULL 的列；updated_at 保留原值，不會變成跑這份的時間
--   3. 欄位還可為 NULL、而且已經沒有 NULL 的列，才改成 NOT NULL DEFAULT 0（跟 schema.sql 一致）
--   第一次跑完欄位就是 NOT NULL、沒有 NULL 的列，之後重跑三步都不會改到任何東西。
--   第一次跑到一半中斷（例如加完欄位就斷線）也沒關係：再跑一次會從還是 NULL 的列接著回填，不會漏。
--   還有沒回填到的列（例如回填那句失敗、又用遇錯繼續的方式跑）第 3 步就不做，欄位維持可為 NULL，
--   不會把那些列默默變成 0；這時 SHOW COLUMNS 會看到 Null 是 YES，查出原因後整份再跑一次。
--
-- 執行時機：先停掉舊版後端，跑這份，再啟動新版後端。
--   忘了跑這份：新版後端照樣啟動得起來（hibernate.hbm2ddl.auto = none，啟動時不檢查表結構），
--   但用到這個欄位的請求都會回 500，log 裡是 Unknown column 'stock_deducted'。看到這個錯誤就是還沒跑這份：
--     ・送單：顧客送單、櫃檯代客點餐（寫入 OrderItemEntity）
--     ・取消品項、取消整單（SQL 直接讀這欄）
--     ・櫃檯桌況明細：TableService 的 toOrderDto 用 JPA 讀 OrderItemEntity，點過餐的桌整頁打不開
--     ・查單：OrderSubmitService.getOrder 用 JPA 讀 OrderItemEntity
--   這些請求都會整筆回滾，資料不會壞，跑完這份就恢復。
--   舊版不知道這個欄位，升級後還在跑的話，它送的單會被記成「沒扣」（預設 0），取消時就不會補庫存。
--
-- 先檢查（Preflight）：
-- 1. 還沒加欄位的話，下面這句查不到任何列
-- SHOW COLUMNS FROM order_item LIKE 'stock_deducted';
-- 2. 用餐中、還沒取消（之後還可能被取消；已出餐的也可能撤回後再取消）的品項，以及回填會推測成什麼（1 = 有扣，取消會補回）
-- SELECT oi.id, oi.order_ticket_id, oi.item_name_snapshot, oi.quantity, oi.status, mi.track_inventory AS will_be_stock_deducted
--   FROM order_item oi
--   JOIN order_ticket ot ON ot.id = oi.order_ticket_id
--   JOIN dining_session ds ON ds.id = ot.dining_session_id
--   JOIN menu_item mi ON mi.id = oi.menu_item_id
--  WHERE ds.status = 'OPEN' AND oi.status <> 'CANCELLED' AND ot.status <> 'CANCELLED';

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

-- 只填還是 NULL 的列，也就是剛加上欄位、還沒回填的舊資料；欄位改成 NOT NULL 之後就沒有 NULL，重跑不會改到任何列。
-- updated_at 有 ON UPDATE CURRENT_TIMESTAMP，不明確指定的話會被改成跑這份的時間；設成自己就會保留原值
UPDATE order_item oi
JOIN menu_item mi ON mi.id = oi.menu_item_id
SET oi.stock_deducted = mi.track_inventory,
    oi.updated_at = oi.updated_at
WHERE oi.stock_deducted IS NULL;

-- ── 3. 改成 NOT NULL DEFAULT 0 ─────────────────────────────────────────────

-- 還有 NULL（沒回填到）的列就不改：非 strict 模式下 MODIFY 會把它們默默變成 0，取消時就不補庫存了
SET @stock_deducted_null_rows = (SELECT COUNT(*) FROM order_item WHERE stock_deducted IS NULL);
SET @finish_stock_deducted = (SELECT IF(COUNT(*) = 1 AND @stock_deducted_null_rows = 0,
                                        'ALTER TABLE order_item MODIFY COLUMN stock_deducted TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''送單時是否扣了庫存；取消時依此決定要不要補回，不看品項現在的 track_inventory''',
                                        'DO 0')
                                FROM information_schema.columns
                               WHERE table_schema = DATABASE() AND table_name = 'order_item'
                                 AND column_name = 'stock_deducted' AND is_nullable = 'YES');
PREPARE finish_stock_deducted_stmt FROM @finish_stock_deducted;
EXECUTE finish_stock_deducted_stmt;
DEALLOCATE PREPARE finish_stock_deducted_stmt;
