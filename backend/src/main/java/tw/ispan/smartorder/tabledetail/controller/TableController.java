package tw.ispan.smartorder.tabledetail.controller;

import tw.ispan.smartorder.tabledetail.dto.CheckoutRequest;
import tw.ispan.smartorder.tabledetail.dto.CancelSessionResponse;
import tw.ispan.smartorder.tabledetail.dto.SettleResponse;
import tw.ispan.smartorder.tabledetail.dto.TableDetailResponse;
import tw.ispan.smartorder.tabledetail.service.TableService;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
public class TableController {

    private final TableService service;

    public TableController(TableService service) {
        this.service = service;
    }

    @GetMapping("/tables/{tableNumber}/detail")
    public TableDetailResponse getDetail(
            @PathVariable String tableNumber
    ) {
        return service.getDetail(tableNumber);
    }

    @GetMapping("/dining-sessions/{id}")
    public TableDetailResponse getSessionDetail(@PathVariable Long id) {
        return service.getSessionDetail(id);
    }

    @PostMapping("/dining-sessions/{id}/settle")
    public SettleResponse settle(@PathVariable Long id, @RequestBody CheckoutRequest request) {
        return service.settle(id, request);
    }

    @PostMapping("/dining-sessions/{id}/cancel")
    public CancelSessionResponse cancel(@PathVariable Long id) {
        return service.cancel(id);
    }
}
