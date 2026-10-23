package tw.ispan.smartorder.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import tw.ispan.smartorder.dto.RegisterWaitlistRequest;
import tw.ispan.smartorder.dto.SeatWaitlistRequest;
import tw.ispan.smartorder.dto.WaitlistResponse;
import tw.ispan.smartorder.dto.WaitlistTodaySummary;
import tw.ispan.smartorder.service.WaitlistService;

@RestController
@RequestMapping("/api/admin/waitlist")
public class WaitlistController {

    @Autowired
    private WaitlistService waitlistService;

    @GetMapping
    public List<WaitlistResponse> findActive() {
        return waitlistService.findActive();
    }

    @GetMapping("/today-summary")
    public WaitlistTodaySummary todaySummary() {
        return waitlistService.todaySummary();
    }

    @PostMapping
    public WaitlistResponse register(@RequestBody RegisterWaitlistRequest request) {
        return waitlistService.register(request);
    }

    @PostMapping("/{id}/call")
    public WaitlistResponse call(@PathVariable Long id) {
        return waitlistService.call(id);
    }

    // S-10b 報到開桌：POST /api/admin/waitlist/{id}/seat，body 帶選好的 tableId
    @PostMapping("/{id}/seat")
    public WaitlistResponse seat(@PathVariable Long id, @RequestBody SeatWaitlistRequest request) {
        return waitlistService.seat(id, request.tableId());
    }

    @DeleteMapping("/{id}")
    public void abandon(@PathVariable Long id) {
        waitlistService.abandon(id);
    }

}
