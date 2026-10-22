package tw.ispan.smartorder.reservation.controller;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tw.ispan.smartorder.reservation.dto.response.ReservationDetailResponse;
import tw.ispan.smartorder.reservation.security.MemberIdentityResolver;
import tw.ispan.smartorder.reservation.service.ReservationService;

// 會員看自己的訂位（C-19）。網址不帶會員 id，從登入身分取，沒辦法改個 id 去看別人的。
// 身分目前是 mock（MEMBER_MOCK_ENABLED），換成真的會員 JWT 只動 MemberIdentityResolver，這裡不用改；
// 沒登入時 memberId 是 null，由 service 回 401
@RestController
@RequestMapping("/api/members/me/reservations")
public class MemberReservationController {
    private final ReservationService service;
    private final MemberIdentityResolver memberIdentity;

    public MemberReservationController(ReservationService service, MemberIdentityResolver memberIdentity) {
        this.service = service;
        this.memberIdentity = memberIdentity;
    }

    @GetMapping
    public List<ReservationDetailResponse> list(HttpServletRequest httpRequest) {
        return service.memberReservations(memberIdentity.memberId(httpRequest));
    }
}
