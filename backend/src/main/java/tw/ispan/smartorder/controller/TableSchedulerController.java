package tw.ispan.smartorder.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tw.ispan.smartorder.reservation.dto.response.SchedulerRunResponse;
import tw.ispan.smartorder.service.TableReminderService;

// 桌位提醒排程的手動觸發：demo 不可能真的等排程。和 TableReminderScheduler 呼叫同一份 TableReminderService，
// 按出來的結果就是排程自己跑的結果。/api/admin/scheduler/** 由 SecurityConfig 限 MANAGER。
@RestController
@RequestMapping("/api/admin/scheduler")
public class TableSchedulerController {
    private final TableReminderService tableReminderService;

    public TableSchedulerController(TableReminderService tableReminderService) {
        this.tableReminderService = tableReminderService;
    }

    @PostMapping("/check-overtime")
    public SchedulerRunResponse checkOvertime() {
        return new SchedulerRunResponse("check-overtime", tableReminderService.checkOvertime());
    }

    @PostMapping("/remind-cleaning")
    public SchedulerRunResponse remindCleaning() {
        return new SchedulerRunResponse("remind-cleaning", tableReminderService.remindCleaning());
    }
}
