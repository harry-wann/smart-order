package tw.ispan.smartorder.reservation.service;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tw.ispan.smartorder.common.exception.ApiException;
import tw.ispan.smartorder.entity.DiningSessionEntity;
import tw.ispan.smartorder.entity.DiningTableEntity;
import tw.ispan.smartorder.entity.ReservationEntity;
import tw.ispan.smartorder.repository.DiningSessionRepository;
import tw.ispan.smartorder.repository.DiningTableRepository;
import tw.ispan.smartorder.reservation.config.ReservationProperties;
import tw.ispan.smartorder.reservation.dto.response.AdminReservationResponse;
import tw.ispan.smartorder.reservation.dto.response.AvailableTableResponse;
import tw.ispan.smartorder.reservation.dto.response.CancelReservationResponse;
import tw.ispan.smartorder.reservation.dto.response.HeldForResponse;
import tw.ispan.smartorder.reservation.dto.response.OpenOptionsResponse;
import tw.ispan.smartorder.reservation.dto.response.OpenReservationItem;
import tw.ispan.smartorder.reservation.dto.response.OpenWaitlistItem;
import tw.ispan.smartorder.reservation.dto.response.SeatReservationResponse;
import tw.ispan.smartorder.reservation.dto.response.UpcomingReservationResponse;
import tw.ispan.smartorder.reservation.enums.CancelSource;
import tw.ispan.smartorder.reservation.enums.ReservationStatus;
import tw.ispan.smartorder.reservation.repository.ReservationRepository;
import tw.ispan.smartorder.staff.repository.StaffRepository;
import tw.ispan.smartorder.staff.security.StaffPrincipal;

// S-07 預約管理：櫃檯看一天的訂位、代客取消、報到開桌（S-07b）。
// 預約保留不存欄位也沒有排程，都是 TableHoldService 從訂位時間算出來的，
// 所以這裡取消、報到只要把訂位狀態改對，保留就會自己消失，不用去改桌子。
@Service
public class AdminReservationService {
    private static final Logger log = LoggerFactory.getLogger(AdminReservationService.class);
    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");
    // DiningTableEntity.status 是 String 不是 enum，值要跟 M2 桌位的三種狀態一致
    private static final String TABLE_AVAILABLE = "AVAILABLE";
    private static final String TABLE_OCCUPIED = "OCCUPIED";
    private static final SecureRandom random = new SecureRandom();

    private final ReservationRepository reservationRepo;
    private final DiningTableRepository tableRepo;
    private final DiningSessionRepository sessionRepo;
    private final StaffRepository staffRepo;
    private final TableHoldService holdService;
    private final ReservationProperties properties;
    private final Clock clock;

    public AdminReservationService(
            ReservationRepository reservationRepo,
            DiningTableRepository tableRepo,
            DiningSessionRepository sessionRepo,
            StaffRepository staffRepo,
            TableHoldService holdService,
            ReservationProperties properties,
            Clock clock) {
        this.reservationRepo = reservationRepo;
        this.tableRepo = tableRepo;
        this.sessionRepo = sessionRepo;
        this.staffRepo = staffRepo;
        this.holdService = holdService;
        this.properties = properties;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<AdminReservationResponse> list(LocalDate date) {
        List<ReservationEntity> reservations = reservationRepo
                .findByStartTimeGreaterThanEqualAndStartTimeLessThanOrderByStartTimeAscIdAsc(
                        date.atStartOfDay(),
                        date.plusDays(1).atStartOfDay());
        if (reservations.isEmpty()) {
            return List.of();
        }

        // 配桌號和實際坐的桌是兩回事：取消的訂位 table_id 已經是 NULL 所以沒有配桌號；
        // 報到不會改 table_id，實際坐哪張要去 dining_session 找
        Set<Long> tableIds = reservations.stream()
                .map(ReservationEntity::getTableId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, String> tableNos = tableRepo.findAllById(tableIds).stream()
                .collect(Collectors.toMap(DiningTableEntity::getId, DiningTableEntity::getTableNo));
        List<Long> reservationIds = reservations.stream()
                .map(ReservationEntity::getId)
                .toList();
        Map<Long, String> seatedTableNos = reservationRepo.findSeatedTables(reservationIds).stream()
                .collect(Collectors.toMap(projection -> projection.getReservationId(), projection -> projection.getTableNo()));
        Set<Long> staffIds = reservations.stream()
                .map(ReservationEntity::getCancelledByStaffId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, String> staffNames = staffRepo.findAllById(staffIds).stream()
                .collect(Collectors.toMap(staff -> staff.getId(), staff -> staff.getDisplayName()));
        LocalDateTime now = LocalDateTime.now(clock);

        List<AdminReservationResponse> result = new ArrayList<>();
        for (ReservationEntity reservation : reservations) {
            result.add(toAdminResponse(
                    reservation,
                    tableNos.get(reservation.getTableId()),
                    seatedTableNos.get(reservation.getId()),
                    staffNames.get(reservation.getCancelledByStaffId()),
                    now));
        }
        return result;
    }

    // 櫃檯代客取消：隨時可以取消，不受客人那邊「訂位前 30 分」的期限；客人來電說不來了就是走這裡。
    // 取消後那張桌的保留跟著消失、名額也放出來（entity 的 cancel() 會清掉 table_id）
    @Transactional
    public CancelReservationResponse cancelByStaff(Long id, StaffPrincipal staff, String reason) {
        // 先鎖住再檢查狀態，兩個櫃檯同時按或剛好在報到，後到的會看到已經不是 CONFIRMED
        ReservationEntity reservation = reservationRepo.findByIdForUpdate(id);
        if (reservation == null) {
            throw ApiException.notFound("找不到這筆訂位");
        }
        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            throw ApiException.conflict("RESERVATION_NOT_CANCELLABLE", "這筆訂位已經不能取消了");
        }
        reservation.cancel(CancelSource.STAFF, staff.id(), LocalDateTime.now(clock));
        // reason 不存欄位，只寫 log（03 §5）
        log.info("櫃檯代客取消訂位 {}，員工 {}（{}），原因：{}",
                reservation.getReservationNo(), staff.displayName(), staff.id(), reason == null ? "未填" : reason);

        return new CancelReservationResponse(
                reservation.getId(),
                reservation.getStatus(),
                CancelSource.STAFF,
                properties.toOffset(reservation.getCancelledAt()),
                staff.displayName());
    }

    // S-07b 選桌：空桌且坐得下；保留給別筆訂位的不列，自己的原保留桌排第一，
    // 115 分鐘內有別筆訂位的排在沒衝突的後面。
    // 115 分鐘內有訂位只影響排序和提醒，不擋；seat() 也不檢查這一項（M2 問題 5）
    @Transactional(readOnly = true)
    public List<AvailableTableResponse> availableTables(int partySize, Long reservationId) {
        if (partySize < 1) {
            throw ApiException.badRequest("人數至少 1 位");
        }
        TableHolds holds = holdService.snapshot(LocalDateTime.now(clock));
        Set<Long> excludeIds = reservationId == null ? Set.of() : Set.of(reservationId);

        List<AvailableTableResponse> result = new ArrayList<>();
        for (DiningTableEntity table : tableRepo.findAvailable(partySize)) {
            ReservationEntity holder = holds.heldBy(table.getId());
            boolean isOwnHold = holder != null && Objects.equals(holder.getId(), reservationId);
            if (holder != null && !isOwnHold) {
                continue;
            }
            ReservationEntity upcoming = holds.upcoming(table.getId(), excludeIds);
            result.add(new AvailableTableResponse(
                    table.getId(),
                    table.getTableNo(),
                    table.getArea(),
                    table.getSeats(),
                    upcoming == null ? null : upcoming.getStartTime().format(HH_MM),
                    isOwnHold));
        }
        result.sort(Comparator.comparing(AvailableTableResponse::isOwnHold).reversed()
                .thenComparing(response -> response.upcomingReservationAt() != null)
                .thenComparing(AvailableTableResponse::seats)
                .thenComparing(AvailableTableResponse::tableNo));
        return result;
    }

    // S-02 點空桌進開桌頁：可報到的預約、已叫號的候位、這張桌的保留與稍後的訂位
    @Transactional(readOnly = true)
    public OpenOptionsResponse openOptions(Long tableId) {
        DiningTableEntity table = tableRepo.findById(tableId).orElse(null);
        if (table == null || !Boolean.TRUE.equals(table.getActive())) {
            throw ApiException.notFound("找不到這張桌");
        }
        LocalDateTime now = LocalDateTime.now(clock);
        TableHolds holds = holdService.snapshot(now);

        // 報到時間窗內、人數坐得下這張桌的 CONFIRMED 訂位都列，不限原本配到這張的（報到可以改坐別桌）。
        // −10 是保留時間的尾巴、+30 是最早可報到；清單自己看時間，不等 NO_SHOW 排程
        List<ReservationEntity> reservations = reservationRepo
                .findByStatusAndStartTimeGreaterThanEqualAndStartTimeLessThanEqualAndPartySizeLessThanEqualOrderByStartTimeAsc(
                        ReservationStatus.CONFIRMED,
                        now.minusMinutes(properties.getHoldAfterMinutes()),
                        now.plusMinutes(properties.getHoldBeforeMinutes()),
                        table.getSeats());
        Set<Long> assignedTableIds = reservations.stream()
                .map(ReservationEntity::getTableId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, String> assignedTableNos = tableRepo.findAllById(assignedTableIds).stream()
                .collect(Collectors.toMap(DiningTableEntity::getId, DiningTableEntity::getTableNo));
        // 用餐中、待清理的桌不顯示保留，客人到了從 S-07b 另選一張
        ReservationEntity holder = TABLE_AVAILABLE.equals(table.getStatus()) ? holds.heldBy(tableId) : null;
        // 115 分鐘內的下一筆別筆訂位，只提醒不擋；保留中的那筆已經在 heldFor，不重複算進來
        Set<Long> heldIds = holder == null ? Set.of() : Set.of(holder.getId());
        ReservationEntity upcoming = holds.upcoming(tableId, heldIds);

        List<OpenWaitlistItem> waitlist = new ArrayList<>();
        reservationRepo.findCalledWaitlist(table.getSeats()).forEach(item -> waitlist.add(new OpenWaitlistItem(
                item.getId(),
                item.getTicketNo(),
                item.getContactName(),
                item.getPartySize(),
                Duration.between(item.getCreatedAt(), now).toMinutes(),
                "CALLED")));

        List<OpenReservationItem> openReservations = new ArrayList<>();
        for (ReservationEntity reservation : reservations) {
            openReservations.add(new OpenReservationItem(
                    reservation.getId(),
                    reservation.getReservationNo() == null ? "" : reservation.getReservationNo(),
                    reservation.getContactName(),
                    maskPhone(reservation.getContactPhone()),
                    properties.toOffset(reservation.getStartTime()),
                    reservation.getAdultCount(),
                    reservation.getChildCount(),
                    reservation.getPartySize(),
                    0,
                    assignedTableNos.get(reservation.getTableId())));
        }

        HeldForResponse heldFor = holder == null ? null : new HeldForResponse(
                holder.getId(),
                holder.getReservationNo() == null ? "" : holder.getReservationNo(),
                holder.getContactName(),
                holder.getPartySize(),
                properties.toOffset(holder.getStartTime()));
        UpcomingReservationResponse upcomingResponse = upcoming == null ? null : new UpcomingReservationResponse(
                upcoming.getReservationNo() == null ? "" : upcoming.getReservationNo(),
                upcoming.getContactName(),
                properties.toOffset(upcoming.getStartTime()),
                properties.toOffset(upcoming.getEndTime()),
                upcoming.getPartySize());

        return new OpenOptionsResponse(
                tableId,
                table.getTableNo(),
                table.getSeats(),
                table.getArea(),
                table.getStatus(),
                waitlist,
                openReservations,
                heldFor,
                upcomingResponse);
    }

    // 0933123210 → 0933***210
    private String maskPhone(String phone) {
        if (phone.length() < 7) {
            return phone;
        }
        return phone.substring(0, 4) + "***" + phone.substring(phone.length() - 3);
    }

    // 報到開桌，每一步擋的錯誤不一樣，順序是：
    // 1. 鎖訂位，狀態要是 CONFIRMED（RESERVATION_NOT_ACTIVE）。取消和報到會搶同一筆，鎖了才看得到對方的結果
    // 2. 報到時間窗 start−30 ~ start+10（RESERVATION_TOO_EARLY / RESERVATION_EXPIRED）。
    //    這裡自己比時間，不靠 NO_SHOW 排程；排程每 5 分才跑一次，過了 start+10 最多還要再等 5 分才標得到
    // 3. 鎖桌，要是空桌（TABLE_OCCUPIED）、坐得下（400）
    // 4. 桌鎖住之後重算一次預約保留，保留給別筆訂位就擋（TABLE_RESERVED），保留給自己的照常開
    // 5. 都過了才建 dining_session、桌子改 OCCUPIED、訂位改 SEATED。桌子和訂位是已經載入的 entity，
    //    改完狀態 commit 時自動寫回，不用再 save
    // 鎖的順序固定是「訂位再桌位」，跟取消、現場開桌搶同一筆時不會互相卡死
    @Transactional
    public SeatReservationResponse seat(Long id, Long tableId) {
        ReservationEntity reservation = reservationRepo.findByIdForUpdate(id);
        if (reservation == null) {
            throw ApiException.notFound("找不到這筆訂位");
        }
        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            throw ApiException.conflict("RESERVATION_NOT_ACTIVE", "這筆訂位已經取消或已報到");
        }

        // 不能等 NO_SHOW 排程，報到這裡自己看時間
        LocalDateTime now = LocalDateTime.now(clock);
        LocalDateTime start = reservation.getStartTime();
        LocalDateTime checkInFrom = start.minusMinutes(properties.getHoldBeforeMinutes());
        if (now.isBefore(checkInFrom)) {
            throw ApiException.conflict("RESERVATION_TOO_EARLY",
                    "還沒到可報到時間（" + checkInFrom.format(HH_MM) + " 起）");
        }
        if (now.isAfter(start.plusMinutes(properties.getHoldAfterMinutes()))) {
            throw ApiException.conflict("RESERVATION_EXPIRED", "已超過保留時間，請改登記候位");
        }

        DiningTableEntity table = tableRepo.findByIdForUpdate(tableId).orElse(null);
        if (table == null) {
            throw ApiException.notFound("找不到這張桌");
        }
        if (!TABLE_AVAILABLE.equals(table.getStatus())) {
            throw ApiException.conflict("TABLE_OCCUPIED", table.getTableNo() + " 使用中，請換一張桌");
        }
        if (table.getSeats() < reservation.getPartySize()) {
            throw ApiException.badRequest(table.getTableNo() + " 坐不下 " + reservation.getPartySize() + " 位");
        }
        // 鎖住桌位之後再算一次保留，不相信畫面上的狀態；自己的保留桌照常開
        ReservationEntity holder = holdService.snapshot(now).heldBy(tableId);
        if (holder != null && !Objects.equals(holder.getId(), reservation.getId())) {
            throw ApiException.conflict(
                    "TABLE_RESERVED",
                    "這張桌保留給 " + holder.getContactName() + " " + holder.getStartTime().format(HH_MM)
                            + "，客人來電取消的話請到預約管理取消訂位");
        }

        DiningSessionEntity session = new DiningSessionEntity();
        session.setTableId(tableId);
        // 重疊判斷靠這欄找這筆訂位的用餐紀錄，沒填的話 SEATED 的名額會被當成已經釋出
        session.setReservationId(reservation.getId());
        session.setSessionToken(newSessionToken());
        session.setAdultCount(reservation.getAdultCount());
        session.setChildCount(reservation.getChildCount());
        session.setOpenedAt(now);
        session = sessionRepo.save(session);
        table.setStatus(TABLE_OCCUPIED);
        // 不改 table_id：那是訂位當下配的桌，實際坐哪張記在用餐紀錄。
        // 名額會佔到客人結帳為止：SEATED 加上這筆 OPEN 的 dining_session 才算佔位（見 ReservationRepository.findOccupying）
        reservation.setStatus(ReservationStatus.SEATED);

        return new SeatReservationResponse(
                session.getId(),
                table.getTableNo(),
                reservation.getAdultCount(),
                reservation.getChildCount(),
                null,
                List.of());
    }

    private String newSessionToken() {
        byte[] bytes = new byte[16];
        random.nextBytes(bytes);
        StringBuilder token = new StringBuilder();
        for (byte value : bytes) {
            token.append(String.format("%02x", value & 0xff));
        }
        return token.toString();
    }

    private AdminReservationResponse toAdminResponse(
            ReservationEntity reservation,
            String assignedTableNo,
            String seatedTableNo,
            String cancelledByStaffName,
            LocalDateTime now) {
        LocalDateTime start = reservation.getStartTime();
        LocalDateTime checkInFrom = start.minusMinutes(properties.getHoldBeforeMinutes());
        LocalDateTime checkInUntil = start.plusMinutes(properties.getHoldAfterMinutes());
        return new AdminReservationResponse(
                reservation.getId(),
                reservation.getReservationNo() == null ? "" : reservation.getReservationNo(),
                properties.toOffset(start),
                properties.toOffset(reservation.getEndTime()),
                reservation.getContactName(),
                reservation.getContactPhone(),
                reservation.getMemberId() != null,
                reservation.getAdultCount(),
                reservation.getChildCount(),
                reservation.getPartySize(),
                assignedTableNo,
                seatedTableNo,
                reservation.getStatus(),
                // 跟 TableHolds.isHolding 是同一條規則（CONFIRMED、有配桌、在 start−30 ~ start+10）。
                // 這裡手上已經有整天的訂位，直接算，不再查一次；兩邊的規則要一起改
                reservation.getStatus() == ReservationStatus.CONFIRMED
                        && reservation.getTableId() != null
                        && !now.isBefore(checkInFrom)
                        && !now.isAfter(checkInUntil),
                properties.toOffset(checkInFrom),
                properties.toOffset(checkInUntil),
                reservation.getCancelSource(),
                reservation.getCancelledAt() == null ? null : properties.toOffset(reservation.getCancelledAt()),
                cancelledByStaffName,
                0);
    }
}
