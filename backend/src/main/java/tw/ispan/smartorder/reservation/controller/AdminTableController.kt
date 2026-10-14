package tw.ispan.smartorder.reservation.controller

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import tw.ispan.smartorder.reservation.dto.response.AvailableTableResponse
import tw.ispan.smartorder.reservation.service.AdminReservationService

// 從人出發開桌的空桌清單（S-07b，候位的 S-10b 也用同一支）；角色限制在 SecurityConfig
@RestController
@RequestMapping("/api/admin/tables")
class AdminTableController(
    private val service: AdminReservationService,
) {

    @GetMapping("/available")
    fun available(
        @RequestParam partySize: Int,
        @RequestParam(required = false) reservationId: Long?,
    ): List<AvailableTableResponse> {
        return service.availableTables(partySize, reservationId)
    }
}
