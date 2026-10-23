-- 已有資料庫才需要；新建的資料庫直接跑 schema.sql 就是新結構，不用跑這份。
-- 這份做兩件事，整份可以重複執行：
--
-- 1. 分類的出餐順序（04 §4.12）：menu_category 加 cook_order，1 鍋底、2 菜盤、3 火鍋料、4 肉品、5 主食、6 飲料甜點。
--    舊版出菜看板用分類名稱「肉品」判斷出餐順序，店長在菜單管理改了分類名稱就排錯；新版後端改看這個欄位。
--    既有分類依名稱回填：鍋底 1、蔬菜 2、海鮮 2、火鍋料 3、肉品 4、主食 5、飲料 6、酒類 6，其他名稱維持 2（菜盤）。
--    名稱不在這張對照表的分類（例如升級前已經把「肉品」改名成「肉類」）都會被回填成 2，肉類就會排到菜盤那一級。
--    升級前先用檢查查詢 3 列出這些分類，升級後請店長到菜單管理選取分類，在「出餐順序」改成正確的值。
--    只回填「還沒有值」的分類，做法分三步：
--      (a) 欄位不存在才新增，先加成可為 NULL，舊分類都是 NULL
--      (b) 只回填 cook_order 是 NULL 的分類
--      (c) 欄位還是可為 NULL 才改成 NOT NULL DEFAULT 2
--    跑完一次之後每個分類都有值、欄位也是 NOT NULL，重跑時三步都不會改到任何資料，
--    不會蓋掉店長之後在菜單管理改過的出餐順序。萬一第一次跑到一半中斷（欄位加了、還沒回填），重跑會從 (b) 接著做。
--
-- 2. 分類名稱唯一索引 uk_menu_category_name：兩位店長同一瞬間新增同名分類時，後端的重名檢查兩邊都會通過，
--    改由資料庫擋下其中一個（新版後端回 409 CATEGORY_NAME_DUPLICATED）。
--    表的 collation 是 utf8mb4_unicode_ci，比對不分大小寫，跟後端原本的重名檢查一樣。索引已經存在就略過。
--    資料庫裡已經有重名的分類時，這一步的 ALTER 會失敗（Duplicate entry '…' for key 'uk_menu_category_name'）。
--    這時第 1 段（出餐順序）已經做完。腳本不會自動刪除或改名，請用檢查查詢 2 找出重名的分類，擇一改名：
--      ・先啟動新版後端（第 1 段已完成，新版可以正常啟動，只是還沒有唯一索引），到菜單管理把其中一個改名
--      ・或直接用 SQL 改名：UPDATE menu_category SET name = '…' WHERE id = …;
--    分類底下可能有品項，不要直接刪。改完再整份重跑一次；第 1 段重跑時不會再改任何資料。
--
-- 執行時機：先停掉舊版後端再跑，跑完再啟動新版後端。新版讀分類時一定會帶到 menu_category.cook_order
-- （顧客端菜單、菜單管理、出菜看板都是），欄位不在會直接出錯；
-- 舊版後端還開著的話，它在 (b) 和 (c) 之間新增的分類 cook_order 會是 NULL，(c) 會失敗（非嚴格模式則被補成 0，排到鍋底前面）。
-- MySQL 的 DDL 逐句提交，任何一步失敗，處理完原因後整份重跑即可。
--
-- 先檢查（Preflight）：
-- 1. 還沒加欄位的話，下面這句查不到任何列
-- SHOW COLUMNS FROM menu_category LIKE 'cook_order';
-- 2. 重名的分類（GROUP BY 用表的 collation，不分大小寫，跟唯一索引的比對方式一樣）；
--    查到任何列，第 2 段的 ALTER 會失敗，可以升級前先改名，或照第 2 段的說明處理
-- SELECT name, COUNT(*) AS category_count, GROUP_CONCAT(id ORDER BY id) AS category_ids
--   FROM menu_category
--  GROUP BY name
-- HAVING COUNT(*) > 1;
-- 3. 名稱不在回填對照表、第一次升級時會被回填成 2（菜盤）的分類；升級後請到菜單管理調整這些分類的出餐順序
-- SELECT id, name
--   FROM menu_category
--  WHERE name NOT IN ('鍋底', '蔬菜', '海鮮', '火鍋料', '肉品', '主食', '飲料', '酒類')
--  ORDER BY sort_order, id;

SET NAMES utf8mb4;

-- ── 1. 出餐順序 cook_order ──────────────────────────────────────────────────

-- (a) 欄位不存在才新增；先可為 NULL，舊分類都是 NULL，才分得出哪些還沒回填
SET @add_cook_order = (SELECT IF(COUNT(*) = 0,
                                 'ALTER TABLE menu_category ADD COLUMN cook_order TINYINT UNSIGNED NULL COMMENT ''出餐順序：1 鍋底、2 菜盤、3 火鍋料、4 肉品、5 主食、6 飲料甜點；出菜看板依這個排，鍋底品項固定 1'' AFTER sort_order',
                                 'DO 0')
                         FROM information_schema.columns
                        WHERE table_schema = DATABASE() AND table_name = 'menu_category' AND column_name = 'cook_order');
PREPARE add_cook_order_stmt FROM @add_cook_order;
EXECUTE add_cook_order_stmt;
DEALLOCATE PREPARE add_cook_order_stmt;

-- (b) 只回填還沒有值的分類；店長改過的值不是 NULL，不會被蓋掉
UPDATE menu_category
SET cook_order = CASE name
        WHEN '鍋底'   THEN 1
        WHEN '蔬菜'   THEN 2
        WHEN '海鮮'   THEN 2
        WHEN '火鍋料' THEN 3
        WHEN '肉品'   THEN 4
        WHEN '主食'   THEN 5
        WHEN '飲料'   THEN 6
        WHEN '酒類'   THEN 6
        ELSE 2
    END
WHERE cook_order IS NULL;

-- (c) 欄位還是可為 NULL 才改成 NOT NULL DEFAULT 2（跟 schema.sql 一樣）；已經是 NOT NULL 就略過
SET @require_cook_order = (SELECT IF(COUNT(*) = 1,
                                     'ALTER TABLE menu_category MODIFY COLUMN cook_order TINYINT UNSIGNED NOT NULL DEFAULT 2 COMMENT ''出餐順序：1 鍋底、2 菜盤、3 火鍋料、4 肉品、5 主食、6 飲料甜點；出菜看板依這個排，鍋底品項固定 1''',
                                     'DO 0')
                             FROM information_schema.columns
                            WHERE table_schema = DATABASE() AND table_name = 'menu_category'
                              AND column_name = 'cook_order' AND is_nullable = 'YES');
PREPARE require_cook_order_stmt FROM @require_cook_order;
EXECUTE require_cook_order_stmt;
DEALLOCATE PREPARE require_cook_order_stmt;

-- ── 2. 分類名稱唯一索引 ─────────────────────────────────────────────────────

-- 索引已經存在就略過；有重名的分類時這句會失敗，請照檔頭的說明先人工改名再重跑
SET @add_name_unique = (SELECT IF(COUNT(*) = 0,
                                  'ALTER TABLE menu_category ADD UNIQUE KEY uk_menu_category_name (name)',
                                  'DO 0')
                          FROM information_schema.statistics
                         WHERE table_schema = DATABASE() AND table_name = 'menu_category'
                           AND index_name = 'uk_menu_category_name');
PREPARE add_name_unique_stmt FROM @add_name_unique;
EXECUTE add_name_unique_stmt;
DEALLOCATE PREPARE add_name_unique_stmt;
