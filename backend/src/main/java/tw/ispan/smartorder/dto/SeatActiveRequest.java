package tw.ispan.smartorder.dto;

// S-08 停用 / 重新啟用桌位：PATCH /api/admin/tables-config/{id}/active
public record SeatActiveRequest(Boolean active) {
}
