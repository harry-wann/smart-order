package tw.ispan.smartorder.dto;

import java.time.LocalDate;

public record WaitlistTodaySummary(
        LocalDate date,
        String timezone,
        long waitingCount,
        long calledCount,
        long seatedCount,
        long expiredCount,
        long abandonedCount,
        double averageWaitMinutes) {
}
