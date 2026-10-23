package tw.ispan.smartorder.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tw.ispan.smartorder.reservation.dto.response.SchedulerRunResponse;
import tw.ispan.smartorder.service.WaitlistService;

// /api/admin/scheduler/** is restricted to MANAGER by SecurityConfig.
@RestController
@RequestMapping("/api/admin/scheduler")
public class WaitlistSchedulerController {
    private final WaitlistService waitlistService;

    public WaitlistSchedulerController(WaitlistService waitlistService) {
        this.waitlistService = waitlistService;
    }

    @PostMapping("/expire-waitlist")
    public SchedulerRunResponse expireWaitlist() {
        return new SchedulerRunResponse("expire-waitlist", waitlistService.expireOverdue());
    }
}
