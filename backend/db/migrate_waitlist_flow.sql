-- Existing databases only. Run once while registration/seating writes are stopped.
-- This script never deletes, renumbers, or rewrites existing tickets/sessions.
-- Review duplicates first. Either UNIQUE DDL fails on duplicates; resolve the
-- historical data explicitly and rerun only statements not yet applied.
-- MySQL DDL commits per statement, so this is intentionally a one-shot migration.
-- Preflight:
-- SELECT ticket_no, COUNT(*) FROM waitlist GROUP BY ticket_no HAVING COUNT(*) > 1;
-- SELECT waitlist_id, COUNT(*) FROM dining_session WHERE waitlist_id IS NOT NULL
--   GROUP BY waitlist_id HAVING COUNT(*) > 1;

ALTER TABLE waitlist ADD UNIQUE KEY uk_waitlist_ticket_no (ticket_no);
ALTER TABLE dining_session ADD UNIQUE KEY uk_dining_session_waitlist (waitlist_id);
ALTER TABLE waitlist ADD COLUMN expired_at DATETIME(3) NULL AFTER seated_at;

CREATE TABLE waitlist_ticket_counter (
  id       TINYINT UNSIGNED NOT NULL,
  next_no  BIGINT UNSIGNED  NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='候位 A 號下一序號';

-- Account for every historical A-number, including the seed A10–A14.
INSERT INTO waitlist_ticket_counter (id, next_no)
SELECT 1, GREATEST(1, COALESCE(MAX(CAST(SUBSTRING(ticket_no, 2) AS UNSIGNED)), 0) + 1)
FROM waitlist
WHERE ticket_no REGEXP '^[Aa][0-9]+$';
