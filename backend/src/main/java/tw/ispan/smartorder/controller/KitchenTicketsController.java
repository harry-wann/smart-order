package tw.ispan.smartorder.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tw.ispan.smartorder.dto.KitchenTicketResponse;
import tw.ispan.smartorder.service.KitchenTicketService;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class KitchenTicketsController {

    private final KitchenTicketService kitchenTicketService;

    public KitchenTicketsController(KitchenTicketService kitchenTicketService) {
        this.kitchenTicketService = kitchenTicketService;
    }

    @GetMapping("/kitchen/tickets")
    public List<KitchenTicketResponse> getKitchenTickets() {
        return kitchenTicketService.getKitchenTickets();
    }
}
