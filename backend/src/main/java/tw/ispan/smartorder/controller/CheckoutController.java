package tw.ispan.smartorder.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tw.ispan.smartorder.dto.BillResponse;
import tw.ispan.smartorder.service.BillService;

@RestController
@RequestMapping("/api/dining")
public class CheckoutController {
    private final BillService billService;

    public CheckoutController(BillService billService) {
        this.billService = billService;
    }

    @GetMapping("/bill")
    public BillResponse bill(@RequestAttribute("diningSessionId") long sessionId) {
        return billService.calculateBill(sessionId);
    }
}
