package tw.ispan.smartorder.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import tw.ispan.smartorder.dto.ReservableRequest;
import tw.ispan.smartorder.dto.SeatRequest;
import tw.ispan.smartorder.dto.SeatResponse;
import tw.ispan.smartorder.service.SeatService;

@RestController
@RequestMapping("/api/admin/tables-config")
public class SeatController {

    @Autowired
    private SeatService seatService;

    @GetMapping
    public List<SeatResponse> findAll() {
        return seatService.findAll();
    }

    @PatchMapping("/{id}/reservable")
    public SeatResponse updateReservable(@PathVariable Long id,
                                         @RequestBody ReservableRequest request) {
        return seatService.updateReservable(id, request.reservable());
    }

    // S-08 新增桌位：POST /api/admin/tables-config
    @PostMapping
    public SeatResponse create(@RequestBody SeatRequest request) {
        return seatService.create(request);
    }

    // S-08 編輯桌位：PUT /api/admin/tables-config/{id}
    @PutMapping("/{id}")
    public SeatResponse update(@PathVariable Long id, @RequestBody SeatRequest request) {
        return seatService.update(id, request);
    }

}