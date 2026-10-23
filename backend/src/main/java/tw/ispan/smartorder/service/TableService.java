package tw.ispan.smartorder.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tw.ispan.smartorder.common.exception.ApiException;
import tw.ispan.smartorder.dto.TableOverviewResponse;
import tw.ispan.smartorder.entity.DiningSessionEntity;
import tw.ispan.smartorder.entity.DiningTableEntity;
import tw.ispan.smartorder.repository.DiningSessionRepository;
import tw.ispan.smartorder.repository.DiningTableRepository;
import tw.ispan.smartorder.reservation.service.TableHoldService;
import tw.ispan.smartorder.reservation.service.TableHolds;

@Service
@Transactional(readOnly = true)
public class TableService {
    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");

    @Autowired
    private DiningTableRepository diningTables;

    @Autowired
    private DiningSessionRepository diningSessions;

    @Autowired
    private TableStatusNotifier tableStatusNotifier;

    @Autowired
    private TableHoldService tableHoldService;

    // S-02 桌況總覽：每張桌 + 正在用餐的那筆紀錄（人數、開桌時間）
    public List<TableOverviewResponse> findOverview() {
        TableHolds holds = tableHoldService.snapshot(LocalDateTime.now());
        Map<Long, DiningSessionEntity> openByTableId = diningSessions.findByStatus("OPEN").stream()
                .collect(Collectors.toMap(DiningSessionEntity::getTableId, s -> s, (a, b) -> a));

        return diningTables.findByActiveTrueOrderByTableNoAsc().stream()
                .map(t -> TableOverviewResponse.from(t, openByTableId.get(t.getId()),
                        tableHoldService.toHeldFor(holds.heldBy(t.getId()))))
                .toList();
    }

    // 清潔完成：CLEANING → AVAILABLE
    @Transactional
    public void clean(Long id) {
        DiningTableEntity table = lockedTable(id);
        if (!"CLEANING".equals(table.getStatus())) {
            throw ApiException.conflict("TABLE_OCCUPIED", "這桌不是清潔中");
        }
        if (!diningSessions.findOpenSessionIdsByTableId(id).isEmpty()) {
            throw ApiException.conflict("TABLE_OCCUPIED", "這桌仍有未結束的用餐紀錄");
        }
        table.setStatus("AVAILABLE");
        tableStatusNotifier.notifyAfterCommit(table);
    }

    // S-02b 現場開桌：先鎖住這張桌，避免兩個店員同時開同一桌
    @Transactional
    public TableOverviewResponse open(Long id, Integer adultCount, Integer childCount) {
        DiningSessionEntity session = openSession(id, adultCount, childCount);
        return TableOverviewResponse.from(session.getDiningTable(), session, null);
    }

    // 開桌的共用步驟：現場開桌、候位報到都走這裡
    // 鎖桌 → 檢查是空桌 → 建用餐紀錄 → 桌子改成用餐中
    @Transactional
    public DiningSessionEntity openSession(Long tableId, Integer adultCount, Integer childCount) {
        DiningTableEntity table = lockedTable(tableId);
        if (adultCount == null || childCount == null || adultCount < 0 || childCount < 0) {
            throw ApiException.badRequest("成人與兒童人數都必須是非負整數");
        }
        long total = (long) adultCount + childCount;
        if (total < 1 || table.getSeats() == null || total > table.getSeats()) {
            throw ApiException.badRequest("用餐人數需至少 1 位，且不可超過桌位容量");
        }
        if (!"AVAILABLE".equals(table.getStatus())) {
            throw ApiException.conflict("TABLE_OCCUPIED", "此桌已在使用中");
        }
        // 清潔或其他流程若留下 OPEN，不能再開第二筆；只讀 id，不反向鎖 session。
        if (!diningSessions.findOpenSessionIdsByTableId(tableId).isEmpty()) {
            throw ApiException.conflict("TABLE_OCCUPIED", "此桌已有未結束的用餐紀錄");
        }
        var holder = tableHoldService.snapshot(LocalDateTime.now()).heldBy(tableId);
        if (holder != null) {
            throw ApiException.conflict("TABLE_RESERVED",
                    "這張桌保留給 " + holder.getContactName() + " " + holder.getStartTime().format(HH_MM)
                            + "，客人來電取消的話請到預約管理取消訂位");
        }

        // status、金額、cartVersion 在 Entity 已有預設值，這裡只填開桌當下才知道的
        DiningSessionEntity session = new DiningSessionEntity();
        session.setTableId(table.getId());
        session.setDiningTable(table);
        session.setAdultCount(adultCount);
        session.setChildCount(childCount);
        session.setSessionToken(UUID.randomUUID().toString().replace("-", ""));
        session.setOpenedAt(LocalDateTime.now());
        diningSessions.save(session);

        table.setStatus("OCCUPIED");
        tableStatusNotifier.notifyAfterCommit(table);
        return session;
    }

    private DiningTableEntity lockedTable(Long id) {
        // Repository 已在鎖定查詢中限定 active=1；停用桌不供開桌或清潔。
        DiningTableEntity table = diningTables.findByIdForUpdate(id)
                .orElseThrow(() -> ApiException.notFound("找不到桌位"));
        if (!Boolean.TRUE.equals(table.getActive())) {
            throw ApiException.notFound("找不到桌位");
        }
        return table;
    }
}
