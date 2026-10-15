package tw.ispan.smartorder.reservation.controller

import jakarta.servlet.http.HttpServletRequest
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import tw.ispan.smartorder.reservation.dto.response.ReservationDetailResponse
import tw.ispan.smartorder.reservation.security.MemberIdentityResolver
import tw.ispan.smartorder.reservation.service.ReservationService

@RestController
@RequestMapping("/api/members/me/reservations")
class MemberReservationController(
    private val service: ReservationService,
    private val memberIdentity: MemberIdentityResolver,
) {

    @GetMapping
    fun list(httpRequest: HttpServletRequest): List<ReservationDetailResponse> {
        return service.memberReservations(memberIdentity.memberId(httpRequest))
    }
}
