package tw.ispan.smartorder.service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import tw.ispan.smartorder.common.exception.ApiException;
import tw.ispan.smartorder.dto.SeatRequest;
import tw.ispan.smartorder.dto.SeatResponse;
import tw.ispan.smartorder.entity.DiningSessionEntity;
import tw.ispan.smartorder.entity.DiningTableEntity;
import tw.ispan.smartorder.entity.ReservationEntity;
import tw.ispan.smartorder.repository.DiningSessionRepository;
import tw.ispan.smartorder.repository.DiningTableRepository;
import tw.ispan.smartorder.reservation.enums.ReservationStatus;
import tw.ispan.smartorder.reservation.repository.ReservationRepository;

@Service
@Transactional(readOnly = true)
public class SeatService {
    private static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("M/d HH:mm");
    // 要跟 schema 的索引名稱一致，改索引名時這裡也要改，不然同時新增同一個桌號會變成 500
    private static final String UNIQUE_TABLE_NO = "uk_dining_table_no";

    @Autowired
    private DiningTableRepository diningTables;

    @Autowired
    private DiningSessionRepository diningSessions;

    @Autowired
    private ReservationRepository reservations;

    // 訂位時間存的是店家時區的 LocalDateTime，「現在」從這裡拿，跟訂位那邊同一個時鐘
    @Autowired
    private Clock clock;

    // S-08 列表：停用的桌也列出來，才有地方重新啟用；啟用的排前面，再依桌號。
    // 桌況總覽、開桌、訂位挑桌各自用只查啟用桌的查詢，不靠這支
    public List<SeatResponse> findAll() {
        return diningTables.findAllByOrderByActiveDescTableNoAsc().stream()
                .map(SeatResponse::from)
                .toList();
    }

    @Transactional
    public SeatResponse updateReservable(Long id, Boolean reservable) {
        if (reservable == null) {
            throw ApiException.badRequest("請指定要不要開放預約");
        }
        // 也要鎖桌：存檔時會把整列寫回，不鎖的話可能蓋掉同時進行的停用、改座位數或開桌
        DiningTableEntity table = lockTable(id);
        table.setReservable(reservable);
        return SeatResponse.from(table);
    }

    // S-08 新增桌位：新桌一律是空桌、開放預約、啟用中
    @Transactional
    public SeatResponse create(SeatRequest request) {
        String tableNo = validate(request);
        if (diningTables.findByTableNo(tableNo).isPresent()) {
            throw tableNoTaken(tableNo);
        }

        DiningTableEntity table = new DiningTableEntity();
        table.setTableNo(tableNo);
        table.setSeats(request.seats());
        table.setArea(request.area().trim());
        table.setStatus("AVAILABLE");
        table.setReservable(true);
        table.setActive(true);
        // 兩個人同時新增同一個桌號，上面的檢查都會過，最後由 UNIQUE(table_no) 擋下其中一個。
        // 立刻 insert，撞到唯一鍵才會在這個 try 裡丟出來；其他約束錯誤是程式或資料的問題，照常往外丟
        try {
            return SeatResponse.from(diningTables.saveAndFlush(table));
        } catch (DataIntegrityViolationException e) {
            String message = e.getMostSpecificCause().getMessage();
            if (message == null || !message.contains(UNIQUE_TABLE_NO)) {
                throw e;
            }
            throw tableNoTaken(tableNo);
        }
    }

    // S-08 編輯桌位：只能改座位數和區域。桌號印在桌上的 QR code 裡（/order/checkin/{桌號}），
    // 改了舊的 QR 就掃不到這張桌，所以建立後不能改（M2 問題 1：QR 貼上去永不換）。
    // 1. 先鎖這張桌。開桌、報到、建立訂位都會鎖同一列，改座位數會跟它們排隊，
    //    不會「剛檢查完沒有大團訂位，對方就訂進來」
    // 2. 交易用 READ_COMMITTED：等到鎖之後才查得到對方剛提交的訂位和用餐紀錄；
    //    預設的 REPEATABLE READ 可能還在看等鎖之前的舊資料
    // 3. 座位數變少時，不能少於正在用餐的人數、也不能少於還沒結束的訂位人數，不然客人到了坐不下
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public SeatResponse update(Long id, SeatRequest request) {
        String tableNo = validate(request);
        DiningTableEntity table = lockTable(id);
        if (!tableNo.equals(normalizeTableNo(table.getTableNo()))) {
            throw ApiException.conflict("TABLE_NO_IMMUTABLE",
                    "桌號印在桌上的 QR code 裡，建立後不能修改；要換號請停用這張桌再新增");
        }
        if (request.seats() < table.getSeats()) {
            checkSeatsFitGuests(table, request.seats());
        }

        table.setSeats(request.seats());
        table.setArea(request.area().trim());
        return SeatResponse.from(table);
    }

    // S-08 停用 / 重新啟用。停用的桌不會出現在桌況總覽、開桌、線上訂位挑桌（那些查詢都帶 active = 1），
    // 桌上的 QR 也不用撕，之後重新啟用照樣能用。
    // 停用跟 update 一樣在桌位鎖裡、用 READ_COMMITTED 檢查：要是空桌、沒有 OPEN 的用餐紀錄、
    // 沒有還沒結束的訂位配在這張桌；不然客人坐著或訂好了，桌子卻從畫面上消失。重新啟用沒有條件
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public SeatResponse updateActive(Long id, Boolean active) {
        if (active == null) {
            throw ApiException.badRequest("請指定要啟用還是停用");
        }
        DiningTableEntity table = lockTable(id);
        if (!active && Boolean.TRUE.equals(table.getActive())) {
            checkCanDeactivate(table);
        }
        table.setActive(active);
        return SeatResponse.from(table);
    }

    // 不過濾 active：停用的桌也要能編輯、重新啟用
    private DiningTableEntity lockTable(Long id) {
        return diningTables.findByIdForUpdateIncludingInactive(id)
                .orElseThrow(() -> ApiException.notFound("找不到桌位"));
    }

    // 新座位數要坐得下正在用餐的客人、還沒結束的訂位。
    // 訊息講最早的那一筆；下限取所有衝突裡人數最多的，店長照著改一次就會過
    private void checkSeatsFitGuests(DiningTableEntity table, int seats) {
        List<Guests> conflicts = new ArrayList<>();
        for (DiningSessionEntity session : diningSessions.findByTableIdAndStatus(table.getId(), "OPEN")) {
            int count = session.getAdultCount() + session.getChildCount();
            if (count > seats) {
                conflicts.add(new Guests("這張桌正在用餐，有 " + count + " 位客人", count));
            }
        }
        for (ReservationEntity reservation : upcomingReservations(table)) {
            if (reservation.getPartySize() > seats) {
                conflicts.add(new Guests(
                        reservation.getStartTime().format(WHEN) + " 有 " + reservation.getPartySize() + " 位訂位在這張桌",
                        reservation.getPartySize()));
            }
        }
        if (conflicts.isEmpty()) {
            return;
        }

        Guests first = conflicts.getFirst();
        int needed = conflicts.stream().mapToInt(Guests::count).max().orElseThrow();
        String more = needed > first.count() ? "，之後還有人數更多的訂位" : "";
        throw ApiException.conflict("SEATS_BELOW_BOOKINGS",
                first.description() + more + "，座位數不能少於 " + needed);
    }

    private void checkCanDeactivate(DiningTableEntity table) {
        if ("OCCUPIED".equals(table.getStatus())) {
            throw tableInUse("這張桌正在用餐中，客人結帳後才能停用");
        }
        if ("CLEANING".equals(table.getStatus())) {
            throw tableInUse("這張桌還沒清潔完，按清潔完成後才能停用");
        }
        if (!"AVAILABLE".equals(table.getStatus())) {
            throw tableInUse("這張桌現在不是空桌，不能停用");
        }
        if (!diningSessions.findOpenSessionIdsByTableId(table.getId()).isEmpty()) {
            throw tableInUse("這張桌還有沒結束的用餐紀錄，不能停用");
        }
        List<ReservationEntity> upcoming = upcomingReservations(table);
        if (!upcoming.isEmpty()) {
            ReservationEntity next = upcoming.getFirst();
            throw tableInUse("這張桌 " + next.getStartTime().format(WHEN) + " 還有 " + next.getPartySize()
                    + " 位的訂位，請先到預約管理取消，或等訂位結束後再停用");
        }
    }

    // 配到這張桌、還沒結束的 CONFIRMED 訂位。已報到的客人算在用餐紀錄裡，取消、未到的不佔桌
    private List<ReservationEntity> upcomingReservations(DiningTableEntity table) {
        return reservations.findByTableIdAndStatusAndEndTimeAfterOrderByStartTimeAsc(
                table.getId(), ReservationStatus.CONFIRMED, LocalDateTime.now(clock));
    }

    // 檢查必填和範圍，回傳整理過的桌號（去空白、轉大寫：a01 → A01）
    private String validate(SeatRequest request) {
        if (request.tableNo() == null || request.tableNo().isBlank()) {
            throw ApiException.badRequest("請填桌號");
        }
        // 長度跟資料表欄位一致（table_no VARCHAR(10)、area VARCHAR(20)），太長回 400 而不是資料庫錯誤
        if (request.tableNo().trim().length() > 10) {
            throw ApiException.badRequest("桌號最多 10 個字");
        }
        if (request.seats() == null || request.seats() < 1 || request.seats() > 20) {
            throw ApiException.badRequest("座位數要在 1～20 之間");
        }
        if (request.area() == null || request.area().isBlank()) {
            throw ApiException.badRequest("請填區域");
        }
        if (request.area().trim().length() > 20) {
            throw ApiException.badRequest("區域最多 20 個字");
        }
        return normalizeTableNo(request.tableNo());
    }

    private String normalizeTableNo(String tableNo) {
        return tableNo.trim().toUpperCase();
    }

    private ApiException tableNoTaken(String tableNo) {
        return ApiException.conflict("TABLE_NO_TAKEN", "桌號 " + tableNo + " 已經有了");
    }

    private ApiException tableInUse(String message) {
        return ApiException.conflict("TABLE_IN_USE", message);
    }

    // 座位數衝突的一筆：給人看的說明、這筆有幾位
    private record Guests(String description, int count) {
    }

}
