-- ============================================================================
-- smartorder 資料表（基礎版）
--
-- 欄位定義以 docs/spec/03-資料庫設計.md 為準；這份檔案只建基礎功能用到的表，
-- 進階功能（服務鈴、庫存異動紀錄、預先點餐、點數與優惠券）的表不在這裡。
--
-- 使用方式：先選好資料庫（例如 smartorder），再執行這份檔案，接著執行 seed.sql。
--   命令列：mysql -h <主機> -P <埠> -u <帳號> -p smartorder < schema.sql
--   phpMyAdmin：左側點 smartorder → 匯入 → 選這份檔案
--
-- 注意：會先刪掉同名的資料表再重建，裡面的資料會全部清空。
-- MySQL 8.0 與 5.7 都可以（5.7 會忽略 CHECK 限制）／ utf8mb4 ／ utf8mb4_unicode_ci
-- ============================================================================

SET NAMES utf8mb4;

-- 刪表不靠關閉外鍵檢查（phpMyAdmin 匯入預設會開著外鍵檢查，SET FOREIGN_KEY_CHECKS = 0 會被蓋掉），
-- 改成依外鍵順序從子表刪到父表。waitlist 與 dining_session 互相參照，先拿掉 waitlist 那邊的外鍵；
-- 全新的資料庫查不到這個外鍵就略過。
SET @drop_fk = (SELECT CONCAT('ALTER TABLE waitlist DROP FOREIGN KEY ', constraint_name)
                  FROM information_schema.table_constraints
                 WHERE table_schema = DATABASE() AND table_name = 'waitlist'
                   AND constraint_name = 'fk_waitlist_dining_session' AND constraint_type = 'FOREIGN KEY');
SET @drop_fk = COALESCE(@drop_fk, 'DO 0');
PREPARE drop_fk_stmt FROM @drop_fk;
EXECUTE drop_fk_stmt;
DEALLOCATE PREPARE drop_fk_stmt;

DROP TABLE IF EXISTS payment;
DROP TABLE IF EXISTS inventory_item;
DROP TABLE IF EXISTS order_item_option;
DROP TABLE IF EXISTS order_item;
DROP TABLE IF EXISTS order_ticket;
DROP TABLE IF EXISTS cart_item_option;
DROP TABLE IF EXISTS cart_item;
DROP TABLE IF EXISTS dining_session_guest;
DROP TABLE IF EXISTS dining_session;
DROP TABLE IF EXISTS waitlist;
DROP TABLE IF EXISTS waitlist_ticket_counter;
DROP TABLE IF EXISTS reservation;
DROP TABLE IF EXISTS dining_table;
DROP TABLE IF EXISTS menu_item_option_group;
DROP TABLE IF EXISTS option_value;
DROP TABLE IF EXISTS option_group;
DROP TABLE IF EXISTS menu_item;
DROP TABLE IF EXISTS menu_category;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS verification_code;
DROP TABLE IF EXISTS member;

-- ----------------------------------------------------------------------------
-- 1. 帳號與權限
-- ----------------------------------------------------------------------------

CREATE TABLE member (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  phone             VARCHAR(20)     NOT NULL COMMENT '登入帳號 09xxxxxxxx',
  nickname          VARCHAR(50)     NULL     COMMENT 'C-13 可跳過，所以可以是 NULL',
  gender            VARCHAR(10)     NULL     COMMENT 'MALE / FEMALE / OTHER',
  birth_date        DATE            NULL,
  profile_completed TINYINT(1)      NOT NULL DEFAULT 0,
  status            VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE / SUSPENDED',
  created_at        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_member_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='會員';

CREATE TABLE verification_code (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  phone         VARCHAR(20)     NOT NULL,
  code          VARCHAR(6)      NOT NULL,
  attempt_count INT             NOT NULL DEFAULT 0 COMMENT '錯滿 3 次作廢',
  expires_at    DATETIME(3)     NOT NULL COMMENT '建立 +5 分鐘',
  used_at       DATETIME(3)     NULL,
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_verification_code_phone (phone, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='手機驗證碼';

CREATE TABLE staff (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username      VARCHAR(50)     NOT NULL,
  password_hash VARCHAR(100)    NOT NULL COMMENT 'BCrypt',
  display_name  VARCHAR(50)     NOT NULL,
  role          VARCHAR(20)     NOT NULL COMMENT 'COUNTER / KITCHEN / MANAGER',
  active        TINYINT(1)      NOT NULL DEFAULT 1,
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_staff_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='員工';

-- ----------------------------------------------------------------------------
-- 2. 菜單
-- ----------------------------------------------------------------------------

CREATE TABLE menu_category (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(50)     NOT NULL,
  sort_order INT             NOT NULL DEFAULT 0,
  active     TINYINT(1)      NOT NULL DEFAULT 1,
  created_at DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='菜單分類';

CREATE TABLE menu_item (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id     BIGINT UNSIGNED NOT NULL,
  name            VARCHAR(100)    NOT NULL,
  description     VARCHAR(255)    NULL,
  price           DECIMAL(10,2)   NOT NULL COMMENT '基礎價',
  image_url       VARCHAR(500)    NULL,
  is_soup_base    TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '鍋底；每桌至少一份，送出點餐時檢查',
  track_inventory TINYINT(1)      NOT NULL DEFAULT 1 COMMENT '0 = 免費續加品，不扣庫存',
  is_refill       TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '歸類到「免費續加」',
  suitable_for    VARCHAR(20)     NOT NULL DEFAULT 'ALL' COMMENT 'ALL / ADULT / CHILD',
  spicy_level     TINYINT         NOT NULL DEFAULT 0 COMMENT '0–3',
  is_vegetarian   TINYINT(1)      NOT NULL DEFAULT 0,
  contains_beef   TINYINT(1)      NOT NULL DEFAULT 0,
  sold_out        TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '由庫存自動維護',
  sort_order      INT             NOT NULL DEFAULT 0,
  active          TINYINT(1)      NOT NULL DEFAULT 1 COMMENT '0 = 下架',
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_menu_item_category (category_id, active, sort_order),
  CONSTRAINT fk_menu_item_category FOREIGN KEY (category_id) REFERENCES menu_category (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='品項';

CREATE TABLE option_group (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(50)     NOT NULL,
  min_select INT             NOT NULL DEFAULT 0 COMMENT '0 = 非必選',
  max_select INT             NOT NULL DEFAULT 1 COMMENT '1 = 單選；>1 = 可複選',
  sort_order INT             NOT NULL DEFAULT 0,
  created_at DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='選項群組';

CREATE TABLE option_value (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  option_group_id BIGINT UNSIGNED NOT NULL,
  name            VARCHAR(50)     NOT NULL,
  price_delta     DECIMAL(10,2)   NOT NULL DEFAULT 0,
  sort_order      INT             NOT NULL DEFAULT 0,
  active          TINYINT(1)      NOT NULL DEFAULT 1,
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  CONSTRAINT fk_option_value_group FOREIGN KEY (option_group_id) REFERENCES option_group (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='選項';

CREATE TABLE menu_item_option_group (
  menu_item_id    BIGINT UNSIGNED NOT NULL,
  option_group_id BIGINT UNSIGNED NOT NULL,
  sort_order      INT             NOT NULL DEFAULT 0,
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (menu_item_id, option_group_id),
  CONSTRAINT fk_miog_item  FOREIGN KEY (menu_item_id)    REFERENCES menu_item (id),
  CONSTRAINT fk_miog_group FOREIGN KEY (option_group_id) REFERENCES option_group (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='品項與選項群組（多對多）';

-- ----------------------------------------------------------------------------
-- 3. 桌位、訂位、候位
-- ----------------------------------------------------------------------------

CREATE TABLE dining_table (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  table_no   VARCHAR(10)     NOT NULL COMMENT 'A01、B02…',
  seats      INT             NOT NULL,
  area       VARCHAR(20)     NOT NULL,
  status     VARCHAR(20)     NOT NULL DEFAULT 'AVAILABLE' COMMENT 'AVAILABLE / OCCUPIED / CLEANING；預約保留是查詢時算出來的，不存這裡',
  reservable TINYINT(1)      NOT NULL DEFAULT 1 COMMENT '開放線上訂位',
  active     TINYINT(1)      NOT NULL DEFAULT 1,
  created_at DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_dining_table_no (table_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='桌位';

CREATE TABLE reservation (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reservation_no        VARCHAR(20)     NULL     COMMENT 'R-YYMMDD-流水號；insert 拿到 id 後在同一個交易裡填上',
  member_id             BIGINT UNSIGNED NULL     COMMENT '非會員也能訂',
  contact_name          VARCHAR(50)     NOT NULL,
  contact_phone         VARCHAR(20)     NOT NULL,
  contact_email         VARCHAR(100)    NULL     COMMENT '只存不寄',
  start_time            DATETIME(3)     NOT NULL,
  end_time              DATETIME(3)     NOT NULL COMMENT 'start + 100 分 + 15 分清桌緩衝',
  adult_count           INT             NOT NULL DEFAULT 0,
  child_count           INT             NOT NULL DEFAULT 0,
  party_size            INT             NOT NULL,
  table_id              BIGINT UNSIGNED NULL     COMMENT '訂位當下配到的桌；取消時設為 NULL',
  status                VARCHAR(20)     NOT NULL DEFAULT 'CONFIRMED' COMMENT 'CONFIRMED / SEATED / CANCELLED / NO_SHOW',
  access_token          VARCHAR(64)     NOT NULL COMMENT '匿名訂位回來查詢與取消用',
  cancelled_at          DATETIME(3)     NULL,
  cancelled_by_staff_id BIGINT UNSIGNED NULL     COMMENT '櫃檯代客取消的員工',
  cancel_source         VARCHAR(10)     NULL     COMMENT 'CUSTOMER / STAFF',
  created_at            DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at            DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_reservation_no (reservation_no),
  UNIQUE KEY uk_reservation_access_token (access_token),
  UNIQUE KEY uk_reservation_table_start (table_id, start_time),
  KEY idx_reservation_table_time (table_id, start_time, end_time),
  KEY idx_reservation_start (start_time, status),
  KEY idx_reservation_phone (contact_phone),
  CONSTRAINT fk_reservation_member FOREIGN KEY (member_id)             REFERENCES member (id),
  CONSTRAINT fk_reservation_table  FOREIGN KEY (table_id)              REFERENCES dining_table (id),
  CONSTRAINT fk_reservation_staff  FOREIGN KEY (cancelled_by_staff_id) REFERENCES staff (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='訂位';

CREATE TABLE waitlist (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_no         VARCHAR(10)     NOT NULL,
  contact_name      VARCHAR(50)     NOT NULL,
  contact_phone     VARCHAR(20)     NOT NULL COMMENT '只留末四碼',
  adult_count       INT             NOT NULL DEFAULT 0,
  child_count       INT             NOT NULL DEFAULT 0,
  party_size        INT             NOT NULL,
  status            VARCHAR(20)     NOT NULL DEFAULT 'WAITING' COMMENT 'WAITING / CALLED / SEATED / ABANDONED / EXPIRED',
  called_at         DATETIME(3)     NULL     COMMENT '排程從這裡算 10 分鐘過號',
  seated_at         DATETIME(3)     NULL,
  expired_at        DATETIME(3)     NULL,
  dining_session_id BIGINT UNSIGNED NULL     COMMENT '報到後綁定（外鍵在 dining_session 建好後補上）',
  created_at        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_waitlist_ticket_no (ticket_no),
  KEY idx_waitlist_status (status, created_at),
  KEY idx_waitlist_called (called_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='候位';

-- 取號需序列列鎖；seed.sql 重置時會依假資料重新設定 next_no。
CREATE TABLE waitlist_ticket_counter (
  id       TINYINT UNSIGNED NOT NULL,
  next_no  BIGINT UNSIGNED  NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='候位 A 號下一序號';
INSERT INTO waitlist_ticket_counter (id, next_no) VALUES (1, 1);

-- ----------------------------------------------------------------------------
-- 4. 用餐與點餐
-- ----------------------------------------------------------------------------

CREATE TABLE dining_session (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  table_id       BIGINT UNSIGNED NOT NULL,
  member_id      BIGINT UNSIGNED NULL     COMMENT '匿名點餐為 NULL；綁會員是進階 8.10',
  reservation_id BIGINT UNSIGNED NULL     COMMENT '由訂位報到而來',
  waitlist_id    BIGINT UNSIGNED NULL     COMMENT '由候位報到而來',
  session_token  VARCHAR(64)     NOT NULL COMMENT '顧客端 API 憑證',
  adult_count    INT             NOT NULL DEFAULT 0 COMMENT '不參與金額計算',
  child_count    INT             NOT NULL DEFAULT 0,
  status         VARCHAR(20)     NOT NULL DEFAULT 'OPEN' COMMENT 'OPEN / PAID / CANCELLED',
  subtotal       DECIMAL(10,2)   NOT NULL DEFAULT 0,
  service_fee    DECIMAL(10,2)   NOT NULL DEFAULT 0 COMMENT '小計 × 10%',
  total          DECIMAL(10,2)   NOT NULL DEFAULT 0,
  cart_version   BIGINT          NOT NULL DEFAULT 0 COMMENT '購物車版本號，每次異動 +1',
  opened_at      DATETIME(3)     NOT NULL,
  closed_at      DATETIME(3)     NULL,
  created_at     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_dining_session_token (session_token),
  UNIQUE KEY uk_dining_session_waitlist (waitlist_id),
  KEY idx_dining_session_table (table_id, status),
  KEY idx_dining_session_member (member_id, opened_at),
  KEY idx_dining_session_reservation (reservation_id),
  CONSTRAINT fk_dining_session_table       FOREIGN KEY (table_id)       REFERENCES dining_table (id),
  CONSTRAINT fk_dining_session_member      FOREIGN KEY (member_id)      REFERENCES member (id),
  CONSTRAINT fk_dining_session_reservation FOREIGN KEY (reservation_id) REFERENCES reservation (id),
  CONSTRAINT fk_dining_session_waitlist    FOREIGN KEY (waitlist_id)    REFERENCES waitlist (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用餐紀錄（＝帳單）';

ALTER TABLE waitlist
  ADD CONSTRAINT fk_waitlist_dining_session FOREIGN KEY (dining_session_id) REFERENCES dining_session (id);

CREATE TABLE dining_session_guest (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  dining_session_id BIGINT UNSIGNED NOT NULL,
  device_id         VARCHAR(36)     NULL     COMMENT '前端帶的 X-Device-Id，可偽造；只供顯示／診斷，不參與 guest 查找或身分判斷',
  guest_token_hash  CHAR(64)        NULL     COMMENT 'X-Guest-Token 的 SHA-256 十六進位雜湊（原始值不存）；舊資料為 NULL',
  display_name      VARCHAR(50)     NOT NULL COMMENT '會員暱稱，或依加入順序叫「客人 N」',
  member_id         BIGINT UNSIGNED NULL,
  joined_at         DATETIME(3)     NOT NULL,
  created_at        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_guest_token_hash (guest_token_hash),
  KEY idx_guest_session_device (dining_session_id, device_id),
  CONSTRAINT fk_guest_session FOREIGN KEY (dining_session_id) REFERENCES dining_session (id),
  CONSTRAINT fk_guest_member  FOREIGN KEY (member_id)         REFERENCES member (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='同桌客人';

CREATE TABLE cart_item (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  dining_session_id BIGINT UNSIGNED NOT NULL COMMENT '整桌共用一份',
  menu_item_id      BIGINT UNSIGNED NOT NULL,
  quantity          INT             NOT NULL,
  note              VARCHAR(50)     NULL,
  unit_price        DECIMAL(10,2)   NOT NULL COMMENT '加入當下的單價，只給畫面顯示；送單時以菜單現價重算',
  added_by_guest_id BIGINT UNSIGNED NOT NULL,
  created_at        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_cart_item_session (dining_session_id),
  CONSTRAINT fk_cart_item_session FOREIGN KEY (dining_session_id) REFERENCES dining_session (id),
  CONSTRAINT fk_cart_item_menu    FOREIGN KEY (menu_item_id)      REFERENCES menu_item (id),
  CONSTRAINT fk_cart_item_guest   FOREIGN KEY (added_by_guest_id) REFERENCES dining_session_guest (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='共用購物車';

CREATE TABLE cart_item_option (
  cart_item_id    BIGINT UNSIGNED NOT NULL,
  option_value_id BIGINT UNSIGNED NOT NULL,
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (cart_item_id, option_value_id),
  CONSTRAINT fk_cart_item_option_item  FOREIGN KEY (cart_item_id)    REFERENCES cart_item (id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_item_option_value FOREIGN KEY (option_value_id) REFERENCES option_value (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='購物車選項（不快照）';

CREATE TABLE order_ticket (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  dining_session_id     BIGINT UNSIGNED NOT NULL,
  sequence_no           INT             NOT NULL COMMENT '該次用餐的第幾單',
  status                VARCHAR(20)     NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING / PREPARING / SERVED / CANCELLED',
  source                VARCHAR(20)     NOT NULL DEFAULT 'CUSTOMER' COMMENT 'CUSTOMER / STAFF（櫃檯代點）',
  submitted_by_guest_id BIGINT UNSIGNED NULL     COMMENT '誰按的送出；櫃檯代點為 NULL',
  placed_at             DATETIME(3)     NOT NULL,
  cancel_reason         VARCHAR(100)    NULL,
  created_at            DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at            DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_order_ticket_session (dining_session_id, sequence_no),
  KEY idx_order_ticket_status (status, placed_at),
  CONSTRAINT fk_order_ticket_session FOREIGN KEY (dining_session_id)     REFERENCES dining_session (id),
  CONSTRAINT fk_order_ticket_guest   FOREIGN KEY (submitted_by_guest_id) REFERENCES dining_session_guest (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='點餐單';

CREATE TABLE order_item (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_ticket_id     BIGINT UNSIGNED NOT NULL,
  menu_item_id        BIGINT UNSIGNED NOT NULL,
  item_name_snapshot  VARCHAR(100)    NOT NULL,
  unit_price_snapshot DECIMAL(10,2)   NOT NULL,
  options_price       DECIMAL(10,2)   NOT NULL DEFAULT 0,
  quantity            INT             NOT NULL,
  line_total          DECIMAL(10,2)   NOT NULL COMMENT '(unit_price + options_price) × quantity',
  note                VARCHAR(50)     NULL,
  status              VARCHAR(20)     NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING / SERVED / CANCELLED',
  cancel_reason       VARCHAR(100)    NULL,
  served_at           DATETIME(3)     NULL,
  created_at          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_order_item_ticket (order_ticket_id),
  KEY idx_order_item_menu (menu_item_id),
  CONSTRAINT fk_order_item_ticket FOREIGN KEY (order_ticket_id) REFERENCES order_ticket (id),
  CONSTRAINT fk_order_item_menu   FOREIGN KEY (menu_item_id)    REFERENCES menu_item (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='點餐單品項（名稱與價格存快照）';

CREATE TABLE order_item_option (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_item_id       BIGINT UNSIGNED NOT NULL,
  group_name_snapshot VARCHAR(50)     NOT NULL,
  value_name_snapshot VARCHAR(50)     NOT NULL,
  price_delta         DECIMAL(10,2)   NOT NULL DEFAULT 0,
  created_at          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  CONSTRAINT fk_order_item_option_item FOREIGN KEY (order_item_id) REFERENCES order_item (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='點餐單品項選項快照';

-- ----------------------------------------------------------------------------
-- 5. 庫存與付款
-- ----------------------------------------------------------------------------

CREATE TABLE inventory_item (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  menu_item_id  BIGINT UNSIGNED NOT NULL COMMENT '品項層級庫存（1:1）',
  quantity      INT             NOT NULL DEFAULT 0 COMMENT '防超賣：UPDATE ... WHERE quantity >= :qty',
  low_threshold INT             NOT NULL DEFAULT 10 COMMENT '低於此值顯示「低量」',
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_inventory_menu_item (menu_item_id),
  CONSTRAINT ck_inventory_quantity CHECK (quantity >= 0),
  CONSTRAINT fk_inventory_menu_item FOREIGN KEY (menu_item_id) REFERENCES menu_item (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='庫存';

CREATE TABLE payment (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  dining_session_id BIGINT UNSIGNED NOT NULL,
  method            VARCHAR(20)     NOT NULL COMMENT '櫃檯結清：CASH / CARD / BARCODE',
  amount            DECIMAL(10,2)   NOT NULL,
  status            VARCHAR(20)     NOT NULL COMMENT 'PENDING / SUCCESS / FAILED / REFUNDED',
  transaction_no    VARCHAR(50)     NULL     COMMENT 'MOCK-YYYYMMDD-流水號',
  fail_reason       VARCHAR(100)    NULL,
  paid_at           DATETIME(3)     NULL,
  refunded_at       DATETIME(3)     NULL,
  created_at        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_payment_transaction_no (transaction_no),
  CONSTRAINT fk_payment_session FOREIGN KEY (dining_session_id) REFERENCES dining_session (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='付款（全部是模擬）';
