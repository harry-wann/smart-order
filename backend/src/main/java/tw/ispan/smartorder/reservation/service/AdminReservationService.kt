package tw.ispan.smartorder.reservation.service

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tw.ispan.smartorder.common.exception.ApiException
import tw.ispan.smartorder.reservation.config.ReservationProperties
import tw.ispan.smartorder.reservation.dto.response.AdminReservationResponse
import tw.ispan.smartorder.reservation.dto.response.CancelReservationResponse
import tw.ispan.smartorder.reservation.entity.ReservationEntity
import tw.ispan.smartorder.reservation.enums.CancelSource
import tw.ispan.smartorder.reservation.enums.ReservationStatus
import tw.ispan.smartorder.reservation.repository.ReservationRepository
import tw.ispan.smartorder.reservation.repository.ReservationTableRepository
import tw.ispan.smartorder.staff.repository.StaffRepository
import tw.ispan.smartorder.staff.security.StaffPrincipal
import java.time.Clock
import java.time.LocalDate
import java.time.LocalDateTime

// S-07 預約管理：櫃檯看一天的訂位、代客取消
@Service
class AdminReservationService(
    private val reservationRepo: ReservationRepository,
    private val tableRepo: ReservationTableRepository,
    private val staffRepo: StaffRepository,
    private val properties: ReservationProperties,
    private val clock: Clock,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Transactional(readOnly = true)
    fun list(date: LocalDate): List<AdminReservationResponse> {
        val reservations = reservationRepo.findByStartTimeGreaterThanEqualAndStartTimeLessThanOrderByStartTimeAscIdAsc(
            date.atStartOfDay(),
            date.plusDays(1).atStartOfDay(),
        )
        if (reservations.isEmpty()) return emptyList()

        val tableNos = tableRepo.findAllById(reservations.mapNotNull { it.tableId }.toSet())
            .associate { it.id to it.tableNo }
        val seatedTableNos = reservationRepo.findSeatedTables(reservations.map { it.id!! })
            .associate { it.getReservationId() to it.getTableNo() }
        val staffNames = staffRepo.findAllById(reservations.mapNotNull { it.cancelledByStaffId }.toSet())
            .associate { it.id to it.displayName }
        val now = LocalDateTime.now(clock)

        return reservations.map {
            toAdminResponse(it, tableNos[it.tableId], seatedTableNos[it.id], staffNames[it.cancelledByStaffId], now)
        }
    }

    // 櫃檯代客取消：隨時可以取消，不受客人那邊「訂位前 30 分」的期限
    @Transactional
    fun cancelByStaff(id: Long, staff: StaffPrincipal, reason: String?): CancelReservationResponse {
        // 先鎖住再檢查狀態，兩個櫃檯同時按或剛好在報到，後到的會看到已經不是 CONFIRMED
        val reservation = reservationRepo.findByIdForUpdate(id) ?: throw ApiException.notFound("找不到這筆訂位")
        if (reservation.status != ReservationStatus.CONFIRMED) {
            throw ApiException.conflict("RESERVATION_NOT_CANCELLABLE", "這筆訂位已經不能取消了")
        }
        reservation.cancel(CancelSource.STAFF, staff.id, LocalDateTime.now(clock))
        log.info("櫃檯代客取消訂位 {}，員工 {}（{}），原因：{}", reservation.reservationNo, staff.displayName, staff.id, reason ?: "未填")

        return CancelReservationResponse(
            reservationId = reservation.id!!,
            status = reservation.status,
            cancelSource = CancelSource.STAFF,
            cancelledAt = properties.toOffset(reservation.cancelledAt!!),
            cancelledByStaffName = staff.displayName,
        )
    }

    private fun toAdminResponse(
        reservation: ReservationEntity,
        assignedTableNo: String?,
        seatedTableNo: String?,
        cancelledByStaffName: String?,
        now: LocalDateTime,
    ): AdminReservationResponse {
        val start = reservation.startTime!!
        val checkInFrom = start.minusMinutes(properties.holdBeforeMinutes)
        val checkInUntil = start.plusMinutes(properties.holdAfterMinutes)
        return AdminReservationResponse(
            reservationId = reservation.id!!,
            reservationNo = reservation.reservationNo ?: "",
            startTime = properties.toOffset(start),
            endTime = properties.toOffset(reservation.endTime!!),
            contactName = reservation.contactName!!,
            contactPhone = reservation.contactPhone!!,
            member = reservation.memberId != null,
            adultCount = reservation.adultCount,
            childCount = reservation.childCount,
            partySize = reservation.partySize,
            assignedTableNo = assignedTableNo,
            seatedTableNo = seatedTableNo,
            status = reservation.status,
            holding = reservation.status == ReservationStatus.CONFIRMED && reservation.tableId != null &&
                now >= checkInFrom && now <= checkInUntil,
            checkInFrom = properties.toOffset(checkInFrom),
            checkInUntil = properties.toOffset(checkInUntil),
            cancelSource = reservation.cancelSource,
            cancelledAt = reservation.cancelledAt?.let { properties.toOffset(it) },
            cancelledByStaffName = cancelledByStaffName,
            preorderItemCount = 0,
        )
    }
}
