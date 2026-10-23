package tw.ispan.smartorder.reservation.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import tw.ispan.smartorder.entity.ReservationEntity;
import tw.ispan.smartorder.reservation.config.ReservationProperties;

// 一次查詢得到的訂位保留與即將開始訂位；桌況總覽和開桌共用同一套時間窗。
public class TableHolds {
    private final Map<Long, List<ReservationEntity>> byTable;
    private final LocalDateTime now;
    private final ReservationProperties properties;

    TableHolds(List<ReservationEntity> reservations, LocalDateTime now, ReservationProperties properties) {
        this.now = now;
        this.properties = properties;
        Map<Long, List<ReservationEntity>> grouped = new HashMap<>();
        for (ReservationEntity reservation : reservations) {
            Long tableId = Objects.requireNonNull(reservation.getTableId());
            grouped.computeIfAbsent(tableId, ignored -> new ArrayList<>()).add(reservation);
        }
        grouped.values().forEach(list -> list.sort((left, right) -> left.getStartTime().compareTo(right.getStartTime())));
        this.byTable = grouped;
    }

    public ReservationEntity heldBy(Long tableId) {
        List<ReservationEntity> reservations = byTable.get(tableId);
        if (reservations == null) {
            return null;
        }
        return reservations.stream().filter(this::isHolding).findFirst().orElse(null);
    }

    // 尚未進保留窗的 115 分鐘內訂位只供提醒，不阻擋開桌。
    public ReservationEntity upcoming(Long tableId, Set<Long> excludeIds) {
        List<ReservationEntity> reservations = byTable.get(tableId);
        if (reservations == null) {
            return null;
        }
        LocalDateTime until = now.plusMinutes(properties.getOccupyMinutes());
        return reservations.stream()
                .filter(reservation -> !excludeIds.contains(reservation.getId()))
                .filter(reservation -> !isHolding(reservation))
                .filter(reservation -> reservation.getStartTime().isAfter(now)
                        && !reservation.getStartTime().isAfter(until))
                .findFirst()
                .orElse(null);
    }

    // 兩端都含：start−30 到 start+10。
    private boolean isHolding(ReservationEntity reservation) {
        LocalDateTime start = reservation.getStartTime();
        return !now.isBefore(start.minusMinutes(properties.getHoldBeforeMinutes()))
                && !now.isAfter(start.plusMinutes(properties.getHoldAfterMinutes()));
    }
}
