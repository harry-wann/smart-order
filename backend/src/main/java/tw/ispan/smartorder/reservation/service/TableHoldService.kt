package tw.ispan.smartorder.reservation.service

import org.springframework.stereotype.Service
import tw.ispan.smartorder.reservation.config.ReservationProperties
import tw.ispan.smartorder.reservation.entity.ReservationEntity
import tw.ispan.smartorder.reservation.enums.ReservationStatus
import tw.ispan.smartorder.reservation.repository.ReservationRepository
import java.time.LocalDateTime

// 預約保留不存在桌位欄位裡，每次都從訂位算出來（M2 問題 5），所以沒有排程同步的問題
@Service
class TableHoldService(
    private val reservationRepo: ReservationRepository,
    private val properties: ReservationProperties,
) {

    // 一次查出現在需要的訂位：保留窗內的（start 在 now-10 ~ now+30）與 115 分鐘內要開始的
    fun snapshot(now: LocalDateTime): TableHolds {
        val reservations = reservationRepo.findByStatusAndTableIdIsNotNullAndStartTimeGreaterThanEqualAndStartTimeLessThanEqual(
            ReservationStatus.CONFIRMED,
            now.minusMinutes(properties.holdAfterMinutes),
            now.plusMinutes(maxOf(properties.occupyMinutes, properties.holdBeforeMinutes)),
        )
        return TableHolds(reservations, now, properties)
    }
}

class TableHolds(
    reservations: List<ReservationEntity>,
    private val now: LocalDateTime,
    private val properties: ReservationProperties,
) {
    private val byTable = reservations.groupBy { it.tableId!! }.mapValues { (_, list) -> list.sortedBy { it.startTime } }

    // 這張桌現在保留給哪一筆：訂位前 30 分到後 10 分
    fun heldBy(tableId: Long): ReservationEntity? = byTable[tableId]?.firstOrNull { isHolding(it) }

    // 這張桌接下來 115 分鐘（用餐 100＋清桌 15）內要開始的別筆訂位，排除指定的訂位
    fun upcoming(tableId: Long, excludeIds: Set<Long> = emptySet()): ReservationEntity? {
        val until = now.plusMinutes(properties.occupyMinutes)
        return byTable[tableId]?.firstOrNull {
            it.id !in excludeIds && !isHolding(it) && it.startTime!! > now && it.startTime!! <= until
        }
    }

    private fun isHolding(reservation: ReservationEntity): Boolean {
        val start = reservation.startTime!!
        return now >= start.minusMinutes(properties.holdBeforeMinutes) && now <= start.plusMinutes(properties.holdAfterMinutes)
    }
}
