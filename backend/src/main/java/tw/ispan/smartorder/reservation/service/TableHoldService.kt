package tw.ispan.smartorder.reservation.service

import org.springframework.stereotype.Service
import tw.ispan.smartorder.reservation.config.ReservationProperties
import tw.ispan.smartorder.entity.ReservationEntity
import tw.ispan.smartorder.reservation.enums.ReservationStatus
import tw.ispan.smartorder.reservation.repository.ReservationRepository
import java.time.LocalDateTime

// 預約保留不存在桌位欄位裡，每次都從訂位算出來（M2 問題 5），所以沒有排程同步的問題：
// 訂位一離開 CONFIRMED（取消、報到、NO_SHOW）或保留窗過了，條件就不成立，保留自己消失，
// 沒有哪個地方需要記得「把桌子改回來」。
// 用法是先 snapshot() 查一次，再對很多張桌問 heldBy / upcoming，不要每張桌各查一次資料庫。
@Service
class TableHoldService(
    private val reservationRepo: ReservationRepository,
    private val properties: ReservationProperties,
) {

    // 一次查出現在需要的訂位：保留窗內的（start 在 now−10 ~ now+30）與 115 分鐘內要開始的。
    // 下限 now−10 是保留窗的尾巴；上限取 115 和 30 較大的那個，30 就被包在 115 裡面，一次查完兩種用途
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

    // 這張桌現在保留給哪一筆：訂位前 30 分到後 10 分。
    // 同一張桌的兩筆訂位 start 至少差 115 分（重疊判斷擋掉更近的），保留窗才 40 分寬，不會疊在一起，取第一筆就夠
    fun heldBy(tableId: Long): ReservationEntity? = byTable[tableId]?.firstOrNull { isHolding(it) }

    // 這張桌接下來 115 分鐘（用餐 100＋清桌 15）內要開始的別筆訂位，排除指定的訂位。
    // 現在開桌的客人預計吃到 now+115 才走，這段時間有人要來就可能撞到；只拿來提醒，不擋開桌。
    // 已經進保留窗的歸 heldBy，這裡不重複回傳（!isHolding）
    fun upcoming(tableId: Long, excludeIds: Set<Long> = emptySet()): ReservationEntity? {
        val until = now.plusMinutes(properties.occupyMinutes)
        return byTable[tableId]?.firstOrNull {
            it.id !in excludeIds && !isHolding(it) && it.startTime!! > now && it.startTime!! <= until
        }
    }

    // 兩端都含：剛好 start−30 和剛好 start+10 都算保留中，跟 seat() 擋太早（< start−30）、
    // 逾時（> start+10）的邊界是同一條線
    private fun isHolding(reservation: ReservationEntity): Boolean {
        val start = reservation.startTime!!
        return now >= start.minusMinutes(properties.holdBeforeMinutes) && now <= start.plusMinutes(properties.holdAfterMinutes)
    }
}
