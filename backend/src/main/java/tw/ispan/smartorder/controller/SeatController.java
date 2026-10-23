package tw.ispan.smartorder.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import tw.ispan.smartorder.dto.ReservableRequest;
import tw.ispan.smartorder.dto.SeatActiveRequest;
import tw.ispan.smartorder.dto.SeatRequest;
import tw.ispan.smartorder.dto.SeatResponse;
import tw.ispan.smartorder.service.SeatService;

@RestController
@RequestMapping("/api/admin/tables-config")
public class SeatController {

    @Autowired
    private SeatService seatService;

    // 全部的桌，含停用的；啟用的排前面
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

    // S-08 停用 / 重新啟用：PATCH /api/admin/tables-config/{id}/active，body {"active": true|false}
    @PatchMapping("/{id}/active")
    public SeatResponse updateActive(@PathVariable Long id, @RequestBody SeatActiveRequest request) {
        return seatService.updateActive(id, request.active());
    }

}