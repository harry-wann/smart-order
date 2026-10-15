package tw.ispan.smartorder.reservation.controller

import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import tw.ispan.smartorder.reservation.dto.request.CreateReservationRequest
import tw.ispan.smartorder.reservation.dto.response.AvailabilityResponse
import tw.ispan.smartorder.reservation.dto.response.CancelReservationResponse
import tw.ispan.smartorder.reservation.dto.response.ReservationCreatedResponse
import tw.ispan.smartorder.reservation.dto.response.ReservationDetailResponse
import tw.ispan.smartorder.reservation.security.MemberIdentityResolver
import tw.ispan.smartorder.reservation.service.ReservationService
import java.time.LocalDate

// 顧客端訂位，不需要員工 JWT。身分有兩種：會員（Authorization 標頭）和匿名（X-Reservation-Token）。
// memberId() 沒登入就是 null，不會丟錯，因為匿名訂位本來就合法；
// 要不要擋交給 service 依動作決定（建立可以匿名，查詢、取消兩種身分都沒有才 401）
@RestController
@RequestMapping("/api/reservations")
class ReservationController(
    private val service: ReservationService,
    private val memberIdentity: MemberIdentityResolver,
) {

    @GetMapping("/availability")
    fun availability(
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) date: LocalDate,
        @RequestParam partySize: Int,
    ): AvailabilityResponse {
        return service.availability(date, partySize)
    }

    // 送出就成立，沒有付款這一關
    @PostMapping
    fun create(
        @Valid @RequestBody request: CreateReservationRequest,
        httpRequest: HttpServletRequest,
    ): ResponseEntity<ReservationCreatedResponse> {
        val created = service.create(request, memberIdentity.memberId(httpRequest))
        return ResponseEntity.status(HttpStatus.CREATED).body(created)
    }

    // accessToken 放標頭不放網址：網址會進伺服器日誌和瀏覽紀錄，token 不該留在那裡。
    // required = false 是因為會員不用帶；兩個都沒有 service 回 401，
    // 帶了但不是這筆的主人回 404，不讓人用猜 id 確認訂位存不存在
    @GetMapping("/{id}")
    fun detail(
        @PathVariable id: Long,
        @RequestHeader(RESERVATION_TOKEN, required = false) accessToken: String?,
        httpRequest: HttpServletRequest,
    ): ReservationDetailResponse {
        return service.detail(id, accessToken, memberIdentity.memberId(httpRequest))
    }

    // 用 DELETE 但資料不會真的刪：狀態變 CANCELLED、table_id 清掉讓名額釋出，紀錄還留著，
    // 所以回的是取消結果不是 204
    @DeleteMapping("/{id}")
    fun cancel(
        @PathVariable id: Long,
        @RequestHeader(RESERVATION_TOKEN, required = false) accessToken: String?,
        httpRequest: HttpServletRequest,
    ): CancelReservationResponse {
        return service.cancelByCustomer(id, accessToken, memberIdentity.memberId(httpRequest))
    }

    companion object {
        // 標頭名稱要跟 SecurityConfig 的 CORS 允許標頭一致，少列的話瀏覽器預檢就被擋了
        private const val RESERVATION_TOKEN = "X-Reservation-Token"
    }
}
