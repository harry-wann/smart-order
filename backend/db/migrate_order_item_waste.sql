-- 已有資料庫才需要；新建的資料庫直接跑 schema.sql 就是新結構，不用跑這份。
-- 這份做兩件事，整份可以重複執行：
--
-- 1. 出菜看板的「報廢／退菜」（M4 4.9）：order_item 加 wasted_at，分辨這筆 CANCELLED 是報廢（做壞或客人退回、
--    庫存不回補）還是一般取消（未出餐、庫存回補）。只新增一個可為 NULL 的欄位；舊的 CANCELLED 品項 wasted_at 都是 NULL，
--    照舊算一般取消。欄位已經存在就略過。新版後端會讀 wasted_at，所以要「先跑這份、再啟動新版後端」。
--
-- 2. 修補舊版出菜看板留下的狀態不一致。舊版的單狀態不是由品項推導，會留下兩種資料：
--    (a) 單還是 PENDING／PREPARING，但沒取消的品項其實全部 SERVED 了（逐項勾完不會自動完成）→ KDS 卡片收不掉
--    (b) 單已經 SERVED，品項卻還是 PENDING（舊的「整單出完」只改單、不改品項）→ 顧客端出餐進度一直顯示待製作
--    只修用餐中（dining_session.status = 'OPEN'）的桌；已結帳、已取消的歷史資料不動。
--    修法跟新版後端一樣「狀態由品項推導」：先把 (b) 的品項補成 SERVED，再依品項重算這些單的狀態，
--    規則與 OrderTicketStatusUpdater 相同。不改金額：補成 SERVED 的品項本來就計入帳單，
--    重算只會在品項全部取消時把單改成 CANCELLED，那些品項本來就不算錢。
--    第二次執行時已經沒有不一致的資料，兩句 UPDATE 都不會改到任何列。
--
-- 執行時機：先停掉舊版後端再跑（出菜看板改單的交易會先鎖 dining_session，這份直接改單與品項，
-- 兩邊同時跑可能互相等待；真的遇到 deadlock 就整份重跑一次即可）。
--
-- 先檢查（Preflight）：
-- 1. 還沒加欄位的話，下面這句查不到任何列
-- SHOW COLUMNS FROM order_item LIKE 'wasted_at';
-- 2. (a) 用餐中、單沒完成但品項全部出完的單
-- SELECT ot.id, ot.dining_session_id, ot.status
--   FROM order_ticket ot JOIN dining_session ds ON ds.id = ot.dining_session_id
--  WHERE ds.status = 'OPEN' AND ot.status IN ('PENDING', 'PREPARING')
--    AND EXISTS (SELECT 1 FROM order_item oi WHERE oi.order_ticket_id = ot.id AND oi.status = 'SERVED')
--    AND NOT EXISTS (SELECT 1 FROM order_item oi WHERE oi.order_ticket_id = ot.id AND oi.status IN ('PENDING', 'PREPARING'));
-- 3. (b) 用餐中、單已完成但還有待製作的品項
-- SELECT oi.id, oi.order_ticket_id, oi.status, ot.updated_at
--   FROM order_item oi
--   JOIN order_ticket ot ON ot.id = oi.order_ticket_id
--   JOIN dining_session ds ON ds.id = ot.dining_session_id
--  WHERE ds.status = 'OPEN' AND ot.status = 'SERVED' AND oi.status IN ('PENDING', 'PREPARING');

SET NAMES utf8mb4;

-- ── 1. 加 wasted_at ─────────────────────────────────────────────────────────

SET @add_wasted_at = (SELECT IF(COUNT(*) = 0,
                                'ALTER TABLE order_item ADD COLUMN wasted_at DATETIME(3) NULL COMMENT ''報廢（退菜）時間；有值代表這筆 CANCELLED 是報廢、庫存不回補，NULL 是一般取消'' AFTER served_at',
                                'DO 0')
                        FROM information_schema.columns
                       WHERE table_schema = DATABASE() AND table_name = 'order_item' AND column_name = 'wasted_at');
PREPARE add_wasted_at_stmt FROM @add_wasted_at;
EXECUTE add_wasted_at_stmt;
DEALLOCATE PREPARE add_wasted_at_stmt;

-- ── 2. 修補用餐中的單與品項狀態 ─────────────────────────────────────────────

-- (b) 單已 SERVED、品項還是待製作：品項補成 SERVED。
-- served_at 用單的 updated_at：舊版「整單出完」把單改成 SERVED 的那一刻會更新 updated_at，最接近真正出餐的時間，
-- 比「跑 migration 的當下」準。舊版資料庫連線沒設台北時區時，SQL 寫的 updated_at 可能比程式寫的 placed_at 早 8 小時，
-- 所以跟 placed_at 取比較晚的那個，出餐時間不會早於點餐時間。
UPDATE order_item oi
JOIN order_ticket ot ON ot.id = oi.order_ticket_id
JOIN dining_session ds ON ds.id = ot.dining_session_id
SET oi.status = 'SERVED',
    oi.served_at = GREATEST(ot.updated_at, ot.placed_at)
WHERE ds.status = 'OPEN'
  AND ot.status = 'SERVED'
  AND oi.status IN ('PENDING', 'PREPARING');

-- 依品項重算用餐中、還沒取消的單（規則與 OrderTicketStatusUpdater 相同）：
--   沒取消的品項全部出完 → SERVED、出了一部分 → PREPARING、一樣都還沒出 → PENDING、全部取消或報廢 → CANCELLED
-- (a) 的單會在這裡變成 SERVED。已經是 CANCELLED 的單不重算：整單取消是櫃檯／廚房明確做的決定，不能被推回未完成。
-- 算出來跟原本一樣的單，MySQL 不會當成有變動，updated_at 也不會被改
UPDATE order_ticket ot
JOIN dining_session ds ON ds.id = ot.dining_session_id
JOIN (
    SELECT order_ticket_id,
           SUM(status <> 'CANCELLED') AS active_count,
           SUM(status = 'SERVED')     AS served_count
    FROM order_item
    GROUP BY order_ticket_id
) item_counts ON item_counts.order_ticket_id = ot.id
SET ot.status = CASE
        WHEN item_counts.active_count = 0 THEN 'CANCELLED'
        WHEN item_counts.served_count = item_counts.active_count THEN 'SERVED'
        WHEN item_counts.served_count > 0 THEN 'PREPARING'
        ELSE 'PENDING'
    END,
    ot.cancel_reason = CASE
        WHEN item_counts.active_count = 0 THEN COALESCE(ot.cancel_reason, '品項已全部取消')
        ELSE ot.cancel_reason
    END
WHERE ds.status = 'OPEN'
  AND ot.status IN ('PENDING', 'PREPARING', 'SERVED');
