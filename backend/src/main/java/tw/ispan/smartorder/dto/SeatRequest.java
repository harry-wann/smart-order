package tw.ispan.smartorder.dto;

// S-08 新增 / 編輯桌位共用：桌號、座位數、區域
// 「可否預約」有自己的開關（PATCH /reservable），不放在這裡
public record SeatRequest(String tableNo, Integer seats, String area) {
}