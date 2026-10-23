package tw.ispan.smartorder.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tw.ispan.smartorder.dto.EcpayCheckoutResponse;
import tw.ispan.smartorder.dto.EcpayCreateRequest;
import tw.ispan.smartorder.dto.PaymentResultResponse;
import tw.ispan.smartorder.common.exception.ApiException;
import tw.ispan.smartorder.repository.DiningSessionGuestRepository;
import tw.ispan.smartorder.service.EcpayService;
import tw.ispan.smartorder.util.JwtToken;
import io.jsonwebtoken.JwtException;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class PaymentController {
    private final EcpayService ecpayService;
    private final DiningSessionGuestRepository guests;
    private final JwtToken jwtToken;

    public PaymentController(EcpayService ecpayService, DiningSessionGuestRepository guests, JwtToken jwtToken) {
        this.ecpayService = ecpayService;
        this.guests = guests;
        this.jwtToken = jwtToken;
    }

    @PostMapping("/dining/payments/ecpay")
    public EcpayCheckoutResponse createEcpay(@RequestAttribute("diningSessionId") long sessionId,
            @RequestBody(required = false) EcpayCreateRequest request) {
        if (request == null || request.expectedTotal() == null || request.expectedTotal().signum() < 0) {
            throw ApiException.badRequest("請提供有效的預期金額");
        }
        return ecpayService.createCheckout(sessionId, request.expectedTotal());
    }

    @PostMapping("/payments/ecpay/notify")
    public ResponseEntity<String> ecpayNotify(@RequestParam Map<String, String> params) {
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_PLAIN)
                .body(ecpayService.handleNotify(params));
    }

    // 收據查詢不經過 SessionTokenFilter：付完款 session 已經是 PAID，仍要查得到。
    // 前端用付款當下存起來的兩個權杖來查，換桌或重新掃碼後也查得到原本那筆。
    // 身分只認 X-Guest-Token（雜湊對到權杖裡的 session 與 guest），不看 X-Device-Id。
    @GetMapping("/payments/{transactionNo}")
    public PaymentResultResponse result(@PathVariable String transactionNo,
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestHeader(value = "X-Guest-Token", required = false) String guestToken) {
        JwtToken.GuestIdentity identity;
        try {
            identity = jwtToken.parseGuestToken(token);
        } catch (JwtException | IllegalArgumentException exception) {
            throw ApiException.unauthorized("點餐憑證已失效，請重新掃碼");
        }
        boolean validGuest = guests.findVerifiedGuest(guestToken, identity.sessionId(), identity.guestId())
                .isPresent();
        if (!validGuest) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_GUEST_TOKEN", "同桌身分已失效，請用原付款頁面查詢或至櫃檯確認");
        }
        return ecpayService.getResult(transactionNo, identity.sessionId());
    }
}
