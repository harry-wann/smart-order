package tw.ispan.smartorder.dto;

import tw.ispan.smartorder.entity.DiningTableEntity;

public record SeatResponse(
        Long id,
        String tableNo,
        Integer seats,
        String area,
        Boolean reservable,
        String status
) {
    public static SeatResponse from(DiningTableEntity table) {
        return new SeatResponse(
                table.getId(),
                table.getTableNo(),
                table.getSeats(),
                table.getArea(),
                table.getReservable(),
                table.getStatus()
        );
    }
}