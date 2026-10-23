package tw.ispan.smartorder.dto;

import tw.ispan.smartorder.entity.DiningTableEntity;

public record SeatResponse(
        Long id,
        String tableNo,
        Integer seats,
        String area,
        Boolean reservable,
        String status,
        // false 是停用中：S-08 照樣列出來（才能重新啟用），桌況總覽、開桌、訂位都不會用到它
        Boolean active
) {
    public static SeatResponse from(DiningTableEntity table) {
        return new SeatResponse(
                table.getId(),
                table.getTableNo(),
                table.getSeats(),
                table.getArea(),
                table.getReservable(),
                table.getStatus(),
                table.getActive()
        );
    }
}