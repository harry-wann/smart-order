package tw.ispan.smartorder.reservation.controller

import jakarta.validation.Valid
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import tw.ispan.smartorder.common.exception.ApiException
import tw.ispan.smartorder.reservation.dto.request.StaffCancelRequest
import tw.ispan.smartorder.reservation.dto.response.AdminReservationResponse
import tw.ispan.smartorder.reservation.dto.response.CancelReservationResponse
import tw.ispan.smartorder.reservation.service.AdminReservationService
import tw.ispan.smartorder.staff.security.StaffPrincipal
import java.time.LocalDate

// 角色限制寫在 SecurityConfig：COUNTER、MANAGER
@RestController
@RequestMapping("/api/admin/reservations")
class AdminReservationController(
    private val service: AdminReservationService,
) {

    @GetMapping
    fun list(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) date: LocalDate): List<AdminReservationResponse> {
        return service.list(date)
    }

    @PostMapping("/{id}/cancel")
    fun cancel(
        @PathVariable id: Long,
        @Valid @RequestBody(required = false) request: StaffCancelRequest?,
    ): CancelReservationResponse {
        val staff = StaffPrincipal.current() ?: throw ApiException.unauthorized("請先登入")
        return service.cancelByStaff(id, staff, request?.reason)
    }
}
