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
import tw.ispan.smartorder.reservation.dto.request.SeatReservationRequest
import tw.ispan.smartorder.reservation.dto.request.StaffCancelRequest
import tw.ispan.smartorder.reservation.dto.response.AdminReservationResponse
import tw.ispan.smartorder.reservation.dto.response.CancelReservationResponse
import tw.ispan.smartorder.reservation.dto.response.SeatReservationResponse
import tw.ispan.smartorder.reservation.service.AdminReservationService
import tw.ispan.smartorder.staff.security.StaffPrincipal
import java.time.LocalDate

// 角色限制寫在 SecurityConfig：COUNTER、MANAGER。
// 擋人的規則放同一個地方，哪條路徑開給誰一眼看得完；controller 只在需要知道「是誰操作」時才去拿登入的員工
@RestController
@RequestMapping("/api/admin/reservations")
class AdminReservationController(
    private val service: AdminReservationService,
) {

    @GetMapping
    fun list(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) date: LocalDate): List<AdminReservationResponse> {
        return service.list(date)
    }

    @PostMapping("/{id}/seat")
    fun seat(
        @PathVariable id: Long,
        @Valid @RequestBody request: SeatReservationRequest,
    ): SeatReservationResponse {
        return service.seat(id, request.tableId!!)
    }

    // 取消原因是選填，所以連 body 都可以不帶（request 才會是 null）。
    // 是哪個員工取消的從 JWT 拿，不收前端傳的 staffId，不然誰都能填別人的名字進紀錄；
    // 走到這裡一定登入過（沒登入在 SecurityConfig 就 401 了），這個 null 檢查只是保險
    @PostMapping("/{id}/cancel")
    fun cancel(
        @PathVariable id: Long,
        @Valid @RequestBody(required = false) request: StaffCancelRequest?,
    ): CancelReservationResponse {
        val staff = StaffPrincipal.current() ?: throw ApiException.unauthorized("請先登入")
        return service.cancelByStaff(id, staff, request?.reason)
    }
}
