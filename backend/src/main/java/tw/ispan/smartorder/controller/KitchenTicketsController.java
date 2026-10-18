package tw.ispan.smartorder.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;
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

    @GetMapping("/kitchen/tickets/completed-count")
    public int getCompletedTicketCountLast24Hours() {
        return kitchenTicketService.getCompletedTicketCountLast24Hours();
    }
    @PatchMapping("/kitchen/tickets/{ticketId}/complete")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void completeTicket(@PathVariable Long ticketId) {
        kitchenTicketService.completeTicket(ticketId);
    }
}
