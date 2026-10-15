package tw.ispan.smartorder.reservation.controller

import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import tw.ispan.smartorder.reservation.dto.request.CreateReservationRequest
import tw.ispan.smartorder.reservation.dto.response.AvailabilityResponse
import tw.ispan.smartorder.reservation.dto.response.ReservationCreatedResponse
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
}
