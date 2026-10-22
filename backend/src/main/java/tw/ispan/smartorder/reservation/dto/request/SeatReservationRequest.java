package tw.ispan.smartorder.reservation.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class SeatReservationRequest {
    // 櫃檯自己選桌，可以不是訂位當初配到的那張，所以放 body；缺少時由 @NotNull 回欄位錯誤
    @NotNull(message = "請選擇要開的桌")
    private Long tableId;
}
