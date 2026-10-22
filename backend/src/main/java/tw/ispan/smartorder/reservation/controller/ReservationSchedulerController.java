package tw.ispan.smartorder.reservation.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tw.ispan.smartorder.reservation.dto.response.SchedulerRunResponse;
import tw.ispan.smartorder.reservation.service.ReservationJobService;

// demo 不可能真的等排程，每支排程都有一支手動觸發；限 MANAGER（SecurityConfig）。
// 手動觸發和 ReservationScheduler 的 cron 呼叫同一份 ReservationJobService，邏輯只有一份，
// demo 按出來的結果就是排程自己跑的結果。用 POST 是因為會改資料，GET 可能被預取或爬蟲碰到就觸發
@RestController
@RequestMapping("/api/admin/scheduler")
public class ReservationSchedulerController {
    private final ReservationJobService jobService;

    public ReservationSchedulerController(ReservationJobService jobService) {
        this.jobService = jobService;
    }

    @PostMapping("/mark-no-show")
    public SchedulerRunResponse markNoShow() {
        return new SchedulerRunResponse("mark-no-show", jobService.markNoShow());
    }

    @PostMapping("/send-reminders")
    public SchedulerRunResponse sendReminders() {
        return new SchedulerRunResponse("send-reminders", jobService.sendReminders());
    }
}
