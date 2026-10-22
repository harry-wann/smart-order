package tw.ispan.smartorder.reservation.controller;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tw.ispan.smartorder.reservation.dto.response.AvailableTableResponse;
import tw.ispan.smartorder.reservation.dto.response.OpenOptionsResponse;
import tw.ispan.smartorder.reservation.service.AdminReservationService;

// 開桌要的兩份清單：從桌出發（S-02 開桌頁）與從人出發（S-07b／S-10b）；角色限制在 SecurityConfig
@RestController
@RequestMapping("/api/admin/tables")
public class AdminTableController {
    private final AdminReservationService service;

    public AdminTableController(AdminReservationService service) {
        this.service = service;
    }

    // reservationId 只有從 S-07b 替某筆訂位選桌時才帶：那筆自己的保留桌不能當成「被別人保留」濾掉，
    // 還要排第一個；從 S-10b 替候位選桌就不帶
    @GetMapping("/available")
    public List<AvailableTableResponse> available(
            @RequestParam("partySize") int partySize,
            @RequestParam(value = "reservationId", required = false) Long reservationId) {
        return service.availableTables(partySize, reservationId);
    }

    @GetMapping("/{id}/open-options")
    public OpenOptionsResponse openOptions(@PathVariable("id") Long id) {
        return service.openOptions(id);
    }
}
