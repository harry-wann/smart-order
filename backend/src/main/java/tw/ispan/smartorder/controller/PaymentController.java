package tw.ispan.smartorder.controller;

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

    public PaymentController(EcpayService ecpayService, DiningSessionGuestRepository guests) {
        this.ecpayService = ecpayService;
        this.guests = guests;
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

    @GetMapping("/payments/{transactionNo}")
    public PaymentResultResponse result(@PathVariable String transactionNo,
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestHeader(value = "X-Device-Id", required = false) String deviceId) {
        JwtToken.GuestIdentity identity;
        try {
            identity = JwtToken.parseGuestToken(token, deviceId);
        } catch (JwtException | IllegalArgumentException exception) {
            throw ApiException.unauthorized("點餐憑證已失效，請重新掃碼");
        }
        boolean validGuest = guests.findById(identity.guestId())
                .filter(guest -> identity.sessionId().equals(guest.getDiningSessionId())
                        && identity.deviceId().equals(guest.getDeviceId()))
                .isPresent();
        if (!validGuest) throw ApiException.unauthorized("點餐憑證已失效，請重新掃碼");
        return ecpayService.getResult(transactionNo, identity.sessionId());
    }
}
