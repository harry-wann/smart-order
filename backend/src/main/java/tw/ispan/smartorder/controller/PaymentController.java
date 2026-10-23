package tw.ispan.smartorder.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tw.ispan.smartorder.dto.EcpayCheckoutResponse;
import tw.ispan.smartorder.dto.PaymentResultResponse;
import tw.ispan.smartorder.service.EcpayService;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class PaymentController {
    private final EcpayService ecpayService;

    public PaymentController(EcpayService ecpayService) {
        this.ecpayService = ecpayService;
    }

    @PostMapping("/dining/payments/ecpay")
    public EcpayCheckoutResponse createEcpay(@RequestAttribute("diningSessionId") long sessionId) {
        return ecpayService.createCheckout(sessionId);
    }

    @PostMapping("/payments/ecpay/notify")
    public ResponseEntity<String> ecpayNotify(@RequestParam Map<String, String> params) {
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_PLAIN)
                .body(ecpayService.handleNotify(params));
    }

    @GetMapping("/payments/{transactionNo}")
    public PaymentResultResponse result(@PathVariable String transactionNo) {
        return ecpayService.getResult(transactionNo);
    }
}
