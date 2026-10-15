package tw.ispan.smartorder.reservation.controller

import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import tw.ispan.smartorder.reservation.dto.response.SchedulerRunResponse
import tw.ispan.smartorder.reservation.service.ReservationJobService

// demo 不可能真的等排程，每支排程都有一支手動觸發；限 MANAGER（SecurityConfig）
@RestController
@RequestMapping("/api/admin/scheduler")
class ReservationSchedulerController(
    private val jobService: ReservationJobService,
) {

    @PostMapping("/mark-no-show")
    fun markNoShow(): SchedulerRunResponse {
        return SchedulerRunResponse("mark-no-show", jobService.markNoShow())
    }

    @PostMapping("/send-reminders")
    fun sendReminders(): SchedulerRunResponse {
        return SchedulerRunResponse("send-reminders", jobService.sendReminders())
    }
}
