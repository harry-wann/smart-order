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

    @GetMapping("/{id}")
    fun detail(
        @PathVariable id: Long,
        @RequestHeader(RESERVATION_TOKEN, required = false) accessToken: String?,
        httpRequest: HttpServletRequest,
    ): ReservationDetailResponse {
        return service.detail(id, accessToken, memberIdentity.memberId(httpRequest))
    }

    @DeleteMapping("/{id}")
    fun cancel(
        @PathVariable id: Long,
        @RequestHeader(RESERVATION_TOKEN, required = false) accessToken: String?,
        httpRequest: HttpServletRequest,
    ): CancelReservationResponse {
        return service.cancelByCustomer(id, accessToken, memberIdentity.memberId(httpRequest))
    }

    companion object {
        private const val RESERVATION_TOKEN = "X-Reservation-Token"
    }
}
