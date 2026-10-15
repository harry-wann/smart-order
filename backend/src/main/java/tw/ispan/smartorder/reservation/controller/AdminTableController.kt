package tw.ispan.smartorder.reservation.controller

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import tw.ispan.smartorder.reservation.dto.response.AvailableTableResponse
import tw.ispan.smartorder.reservation.dto.response.OpenOptionsResponse
import tw.ispan.smartorder.reservation.service.AdminReservationService

// 開桌要的兩份清單：從桌出發（S-02 開桌頁）與從人出發（S-07b／S-10b）；角色限制在 SecurityConfig
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

    @GetMapping("/{id}/open-options")
    fun openOptions(@PathVariable id: Long): OpenOptionsResponse {
        return service.openOptions(id)
    }
}
