package tw.ispan.smartorder.reservation.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tw.ispan.smartorder.common.exception.ApiException;
import tw.ispan.smartorder.entity.DiningTableEntity;
import tw.ispan.smartorder.entity.ReservationEntity;
import tw.ispan.smartorder.repository.DiningTableRepository;
import tw.ispan.smartorder.reservation.config.ReservationProperties;
import tw.ispan.smartorder.reservation.dto.request.CreateReservationRequest;
import tw.ispan.smartorder.reservation.dto.response.AvailabilityResponse;
import tw.ispan.smartorder.reservation.dto.response.CancelReservationResponse;
import tw.ispan.smartorder.reservation.dto.response.ReservationCreatedResponse;
import tw.ispan.smartorder.reservation.dto.response.ReservationDetailResponse;
import tw.ispan.smartorder.reservation.dto.response.SlotResponse;
import tw.ispan.smartorder.reservation.enums.CancelSource;
import tw.ispan.smartorder.reservation.enums.ReservationStatus;
import tw.ispan.smartorder.reservation.projection.MemberContactProjection;
import tw.ispan.smartorder.reservation.repository.ReservationRepository;

// 訂位佔一張桌的長度是 occupyMinutes（用餐 100 + 清桌 15 = 115 分），清桌時間直接算進 end_time，
// 所以重疊判斷只比 start / end，不用另外處理緩衝（M7 問題 2）。
// 資料庫存的是店家時區的 LocalDateTime，「現在」只從 clock 拿，不碰伺服器時區。
@Service
public class ReservationService {
    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter YYMMDD = DateTimeFormatter.ofPattern("yyMMdd");
    // 要跟 schema 的索引名稱一致，改索引名時這裡也要改，不然撞到唯一鍵不會被轉成 SLOT_UNAVAILABLE
    private static final String UNIQUE_TABLE_START = "uk_reservation_table_start";
    private static final LocalTime PREORDER_DEADLINE = LocalTime.of(20, 0);
    private static final SecureRandom random = new SecureRandom();

    private final ReservationRepository reservationRepo;
    private final DiningTableRepository tableRepo;
    private final ReservationProperties properties;
    private final Clock clock;

    public ReservationService(
            ReservationRepository reservationRepo,
            DiningTableRepository tableRepo,
            ReservationProperties properties,
            Clock clock) {
        this.reservationRepo = reservationRepo;
        this.tableRepo = tableRepo;
        this.properties = properties;
        this.clock = clock;
    }

    // 只是給客人看的剩餘桌數，沒有上鎖；按下確認時 create() 會在鎖裡重算一次，
    // 所以這裡顯示有位、送出卻客滿是可能發生的
    @Transactional(readOnly = true)
    public AvailabilityResponse availability(LocalDate date, int partySize) {
        checkBookableDate(date);
        if (partySize < 1) {
            throw ApiException.badRequest("人數至少 1 位");
        }

        List<DiningTableEntity> tables = tableRepo.findReservable(partySize);
        List<LocalDateTime> slotStarts = slotTimes().stream().map(date::atTime).toList();
        // 整天的訂位一次查完，每個時段再在記憶體裡用同一條 start < 時段結束 且 end > 時段開始 過濾，
        // 不要每一格各查一次資料庫
        List<ReservationEntity> occupying = findOccupying(
                tables,
                slotStarts.getFirst(),
                slotStarts.getLast().plusMinutes(properties.getOccupyMinutes()));

        List<SlotResponse> slots = new ArrayList<>();
        for (LocalDateTime start : slotStarts) {
            LocalDateTime end = start.plusMinutes(properties.getOccupyMinutes());
            Set<Long> busyTableIds = new HashSet<>();
            for (ReservationEntity reservation : occupying) {
                if (reservation.getStartTime().isBefore(end) && reservation.getEndTime().isAfter(start)
                        && reservation.getTableId() != null) {
                    busyTableIds.add(reservation.getTableId());
                }
            }
            int remaining = (int) tables.stream()
                    .filter(table -> !busyTableIds.contains(table.getId()))
                    .count();
            slots.add(new SlotResponse(start.toLocalTime().format(HH_MM), remaining > 0, remaining));
        }
        return new AvailabilityResponse(date, properties.getDiningMinutes(), properties.getBufferMinutes(), slots);
    }

    // 建立訂位，順序不能亂：
    // 1. 先 FOR UPDATE 鎖住所有坐得下的候選桌。要先知道誰被佔用才挑得出桌，
    //    挑完才鎖單一張的話中間又會被插隊，乾脆整組鎖住再算。代價是同時訂位的人要排隊，桌數不多，可以接受
    // 2. 在鎖裡才查重疊，排除佔用的桌後挑座位最少的（best-fit）。順序反過來（先查再鎖），
    //    拿到鎖時查到的結果已經過期，兩個人會挑到同一張桌
    // 3. saveAndFlush 馬上 insert。UNIQUE(table_id, start_time) 只擋 start 完全一樣的，
    //    18:00 和 19:00 訂同一桌它擋不住，重疊要靠上面那把鎖；它是鎖之外的最後一道保險
    // 4. insert 拿到 id 才組得出 reservationNo，同一個交易裡補上，commit 時 update 進去
    // 沒有坐得下的桌、或坐得下的都被佔了，都是同一個 SLOT_UNAVAILABLE
    @Transactional
    public ReservationCreatedResponse create(CreateReservationRequest request, Long memberId) {
        LocalDateTime start = Objects.requireNonNull(request.getStartTime())
                .atZoneSameInstant(properties.getZone())
                .toLocalDateTime();
        checkBookableDate(start.toLocalDate());
        checkSlot(start);

        int adultCount = Objects.requireNonNull(request.getAdultCount());
        int childCount = request.getChildCount() == null ? 0 : request.getChildCount();
        int partySize = adultCount + childCount;
        LocalDateTime end = start.plusMinutes(properties.getOccupyMinutes());

        // 鎖住所有坐得下的桌之後才查重疊，同時送出的另一筆會在這裡排隊
        List<DiningTableEntity> candidates = tableRepo.findReservableForUpdate(partySize);
        Set<Long> busyTableIds = new HashSet<>();
        for (ReservationEntity reservation : findOccupying(candidates, start, end)) {
            if (reservation.getTableId() != null) {
                busyTableIds.add(reservation.getTableId());
            }
        }
        // best-fit：坐得下的桌裡挑座位最少的，大桌留給大團
        DiningTableEntity table = candidates.stream()
                .filter(candidate -> !busyTableIds.contains(candidate.getId()))
                .min(Comparator.comparing(DiningTableEntity::getSeats).thenComparing(DiningTableEntity::getTableNo))
                .orElseThrow(() -> ApiException.conflict("SLOT_UNAVAILABLE", "這個時段已經客滿了，請改選其他時段"));

        ReservationEntity reservation = new ReservationEntity();
        reservation.setMemberId(memberId);
        reservation.setStartTime(start);
        reservation.setEndTime(end);
        reservation.setAdultCount(adultCount);
        reservation.setChildCount(childCount);
        reservation.setPartySize(partySize);
        reservation.setTableId(table.getId());
        reservation.setAccessToken(newAccessToken());
        fillContact(reservation, request, memberId);

        // 立刻 insert，約束錯誤才會在這個 try 裡丟出來，不會拖到 commit 才炸、catch 接不到
        try {
            reservationRepo.saveAndFlush(reservation);
        } catch (DataIntegrityViolationException e) {
            // 只認 uk_reservation_table_start，這才是「剛好被別人訂走」。
            // 其他唯一鍵（編號、access_token）、外鍵、NOT NULL 出錯是程式或資料的問題，
            // 講成客滿會把 bug 蓋掉，照常往外丟
            String message = e.getMostSpecificCause().getMessage();
            if (message == null || !message.contains(UNIQUE_TABLE_START)) {
                throw e;
            }
            throw ApiException.conflict("SLOT_UNAVAILABLE", "這個時段剛好被訂走了，請改選其他時段");
        }
        // 編號 = 用餐日 + id，不足 4 碼補 0（跟 seed 的 LPAD 一樣），超過也不截斷、不取模，
        // 取模的話 id 差 10000 的兩筆在同一天會撞號
        reservation.setReservationNo(String.format("R-%s-%04d", start.format(YYMMDD), reservation.getId()));

        return toCreatedResponse(reservation, table);
    }

    @Transactional(readOnly = true)
    public ReservationDetailResponse detail(Long id, String accessToken, Long memberId) {
        ReservationEntity reservation = checkAccess(reservationRepo.findById(id).orElse(null), accessToken, memberId);
        DiningTableEntity table = reservation.getTableId() == null
                ? null
                : tableRepo.findById(reservation.getTableId()).orElse(null);
        return toDetailResponse(reservation, table);
    }

    @Transactional(readOnly = true)
    public List<ReservationDetailResponse> memberReservations(Long memberId) {
        if (memberId == null) {
            throw ApiException.unauthorized("請先登入會員");
        }
        List<ReservationEntity> reservations = reservationRepo.findByMemberIdOrderByStartTimeDesc(memberId);
        Set<Long> tableIds = new HashSet<>();
        for (ReservationEntity reservation : reservations) {
            if (reservation.getTableId() != null) {
                tableIds.add(reservation.getTableId());
            }
        }
        var tablesById = tableRepo.findAllById(tableIds).stream()
                .collect(java.util.stream.Collectors.toMap(DiningTableEntity::getId, table -> table));
        List<ReservationDetailResponse> result = new ArrayList<>();
        for (ReservationEntity reservation : reservations) {
            result.add(toDetailResponse(reservation, tablesById.get(reservation.getTableId())));
        }
        return result;
    }

    // 客人線上取消：期限是訂位前 30 分，也就是預約保留開始的時間；之後只能請櫃檯代取消。
    // 1. 鎖訂位再驗身分。取消會跟櫃檯報到、代取消搶同一筆，鎖了之後讀到的狀態才可信。
    //    身分在狀態前面驗：不是自己的訂位一律 404，連它是不是已經取消都不讓對方知道
    // 2. 狀態要還是 CONFIRMED，報到、取消、NO_SHOW 過的都不能再取消
    // 3. 期限用店家時區的現在比，剛好等於期限那一刻也算過了，跟 detail 的 cancellable 是同一條線
    // 4. entity 的 cancel() 會把 table_id 清成 NULL，那個時段的名額才放得出來
    @Transactional
    public CancelReservationResponse cancelByCustomer(Long id, String accessToken, Long memberId) {
        ReservationEntity reservation = checkAccess(reservationRepo.findByIdForUpdate(id), accessToken, memberId);
        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            throw ApiException.conflict("RESERVATION_NOT_CANCELLABLE", "這筆訂位已經不能取消了");
        }
        LocalDateTime deadline = reservation.getStartTime().minusMinutes(properties.getHoldBeforeMinutes());
        if (!LocalDateTime.now(clock).isBefore(deadline)) {
            throw ApiException.conflict("CANCEL_DEADLINE_PASSED", "訂位前 30 分鐘內請來電取消");
        }
        reservation.cancel(CancelSource.CUSTOMER, null, LocalDateTime.now(clock));
        return new CancelReservationResponse(
                reservation.getId(),
                reservation.getStatus(),
                CancelSource.CUSTOMER,
                toOffset(reservation.getCancelledAt()),
                null);
    }

    // 會員看自己的、匿名憑訂位時拿到的 accessToken；只憑 id 不能動別人的訂位。
    // 兩種身分都沒帶才是 401；帶了但對不上、或根本沒這筆，都是同一個 404，從回應看不出差別
    private ReservationEntity checkAccess(ReservationEntity reservation, String accessToken, Long memberId) {
        if ((accessToken == null || accessToken.isBlank()) && memberId == null) {
            throw ApiException.unauthorized("請登入會員，或用訂位時的這支手機查詢");
        }
        boolean allowed = reservation != null
                && ((memberId != null && Objects.equals(reservation.getMemberId(), memberId))
                        || sameToken(reservation.getAccessToken(), accessToken));
        // 不是自己的也回 404，不讓人用猜 id 的方式確認訂位存不存在
        if (!allowed) {
            throw ApiException.notFound("找不到這筆訂位");
        }
        return reservation;
    }

    // 不用 == / equals：它們遇到第一個不同的字元就回傳，量回應時間就能一個字元一個字元猜出 token
    private boolean sameToken(String expected, String actual) {
        if (expected == null || isBlankText(actual)) {
            return false;
        }
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), actual.getBytes(StandardCharsets.UTF_8));
    }

    private ReservationDetailResponse toDetailResponse(ReservationEntity reservation, DiningTableEntity table) {
        LocalDateTime start = reservation.getStartTime();
        LocalDateTime cancellableUntil = start.minusMinutes(properties.getHoldBeforeMinutes());
        return new ReservationDetailResponse(
                reservation.getId(),
                reservation.getReservationNo(),
                reservation.getStatus(),
                toOffset(start),
                toOffset(reservation.getEndTime()),
                reservation.getAdultCount(),
                reservation.getChildCount(),
                reservation.getPartySize(),
                table == null ? null : table.getTableNo(),
                table == null ? null : table.getSeats(),
                table == null ? null : table.getArea(),
                reservation.getContactName(),
                reservation.getMemberId() != null,
                toOffset(cancellableUntil),
                reservation.getStatus() == ReservationStatus.CONFIRMED && LocalDateTime.now(clock).isBefore(cancellableUntil),
                reservation.getCancelSource(),
                reservation.getCancelledAt() == null ? null : toOffset(reservation.getCancelledAt()),
                false);
    }

    // 會員：手機一律用會員資料裡的，姓名請求有填就用請求的，沒有就退回暱稱。
    // 查不到或不是 ACTIVE 的會員在這裡擋成 401（mock 模式下 id 可以隨便帶），不要等 insert 才撞外鍵。
    // 匿名：姓名和手機一定要有，email 選填、只存不寄
    private void fillContact(ReservationEntity reservation, CreateReservationRequest request, Long memberId) {
        if (memberId != null) {
            MemberContactProjection member = reservationRepo.findMemberContact(memberId);
            if (member == null) {
                throw ApiException.unauthorized("會員身分無效，請重新登入");
            }
            String requestedName = request.getContactName();
            String nickname = member.getNickname();
            reservation.setContactName(requestedName != null && !isBlankText(requestedName)
                    ? requestedName
                    : nickname != null ? nickname : "會員");
            reservation.setContactPhone(member.getPhone());
            String email = request.getContactEmail();
            reservation.setContactEmail(email != null && !isBlankText(email) ? email : null);
            return;
        }

        String name = request.getContactName() == null ? null : trimWhitespace(request.getContactName());
        String phone = request.getContactPhone();
        if (name == null || name.isEmpty() || phone == null || phone.isEmpty()) {
            throw ApiException.badRequest("請填寫姓名與手機號碼");
        }
        reservation.setContactName(name);
        reservation.setContactPhone(phone);
        String email = request.getContactEmail();
        reservation.setContactEmail(email != null && !isBlankText(email) ? email : null);
    }

    private boolean isBlankText(String value) {
        if (value == null || value.isEmpty()) {
            return true;
        }
        for (int index = 0; index < value.length(); index++) {
            char character = value.charAt(index);
            if (!Character.isWhitespace(character) && !Character.isSpaceChar(character)) {
                return false;
            }
        }
        return true;
    }

    private String trimWhitespace(String value) {
        int start = 0;
        int end = value.length();
        while (start < end && (Character.isWhitespace(value.charAt(start)) || Character.isSpaceChar(value.charAt(start)))) {
            start++;
        }
        while (end > start && (Character.isWhitespace(value.charAt(end - 1)) || Character.isSpaceChar(value.charAt(end - 1)))) {
            end--;
        }
        return value.substring(start, end);
    }

    private List<ReservationEntity> findOccupying(
            List<DiningTableEntity> tables,
            LocalDateTime from,
            LocalDateTime to) {
        if (tables.isEmpty()) {
            return List.of();
        }
        Collection<Long> tableIds = tables.stream()
                .map(DiningTableEntity::getId)
                .filter(Objects::nonNull)
                .toList();
        return reservationRepo.findOccupying(tableIds, from, to);
    }

    // 線上只接明天起 N 天內，當天不接
    private void checkBookableDate(LocalDate date) {
        LocalDate today = LocalDate.now(clock);
        if (!date.isAfter(today) || date.isAfter(today.plusDays(properties.getBookableDays()))) {
            throw ApiException.badRequest("只能訂明天起 " + properties.getBookableDays() + " 天內");
        }
    }

    // start 要剛好落在設定排出來的格子上（firstSlot 起每 slotMinutes 一格到 lastSlot）。
    // 資料模型本身不限固定時段，只是目前只開放這幾格；要放寬就改這裡和 slotTimes
    private void checkSlot(LocalDateTime start) {
        if (!slotTimes().contains(start.toLocalTime())) {
            throw ApiException.badRequest("請選擇營業時段內的整點或半點");
        }
    }

    private List<LocalTime> slotTimes() {
        List<LocalTime> times = new ArrayList<>();
        LocalTime slot = properties.getFirstSlot();
        while (!slot.isAfter(properties.getLastSlot())) {
            times.add(slot);
            slot = slot.plusMinutes(properties.getSlotMinutes());
        }
        return times;
    }

    private ReservationCreatedResponse toCreatedResponse(ReservationEntity reservation, DiningTableEntity table) {
        LocalDateTime start = reservation.getStartTime();
        return new ReservationCreatedResponse(
                reservation.getId(),
                reservation.getReservationNo(),
                reservation.getAccessToken(),
                table.getTableNo(),
                table.getSeats(),
                toOffset(start),
                toOffset(reservation.getEndTime()),
                reservation.getStatus(),
                toOffset(start.minusMinutes(properties.getHoldBeforeMinutes())),
                // 預點（進階）截止是用餐前一天 20:00，跟取消期限是兩條線
                toOffset(start.toLocalDate().minusDays(1).atTime(PREORDER_DEADLINE)),
                // 預先點餐（M7 7.E1）還沒做，先固定回 false
                false);
    }

    private OffsetDateTime toOffset(LocalDateTime time) {
        return properties.toOffset(time);
    }

    // 匿名客人只靠這串存取訂位，所以用 SecureRandom 產 24 bytes（192 bit）讓人猜不到；
    // 加上 rsv_ 前綴一共 52 個字元，放得進 access_token 的 VARCHAR(64)
    private String newAccessToken() {
        byte[] bytes = new byte[24];
        random.nextBytes(bytes);
        StringBuilder token = new StringBuilder("rsv_");
        for (byte value : bytes) {
            token.append(String.format("%02x", value & 0xff));
        }
        return token.toString();
    }
}
