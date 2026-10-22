package tw.ispan.smartorder.reservation.enums;

// 送出就成立，沒有 PENDING。
// CONFIRMED  成立中，會佔桌；進了保留窗（start−30 ~ start+10）就保留桌位
// SEATED     已報到、建了 dining_session；用餐紀錄結帳（不再 OPEN）之前仍然佔著名額
// CANCELLED  客人或櫃檯取消，table_id 清成 NULL
// NO_SHOW    過了 start+10 還沒報到，由排程標記
// 只會從 CONFIRMED 往後走：報到 → SEATED、取消 → CANCELLED、排程 → NO_SHOW，沒有路徑變回 CONFIRMED
public enum ReservationStatus {
    CONFIRMED,
    SEATED,
    CANCELLED,
    NO_SHOW
}
