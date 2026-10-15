package tw.ispan.smartorder.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tw.ispan.smartorder.dto.TableOverviewResponse;
import tw.ispan.smartorder.entity.DiningSessionEntity;
import tw.ispan.smartorder.entity.DiningTableEntity;
import tw.ispan.smartorder.repository.DiningSessionRepository;
import tw.ispan.smartorder.repository.DiningTableRepository;

@Service
@Transactional(readOnly = true)
public class TableService {

    @Autowired
    private DiningTableRepository diningTables;

    @Autowired
    private DiningSessionRepository diningSessions;

    // S-02 桌況總覽：每張桌 + 正在用餐的那筆紀錄（人數、開桌時間）
    public List<TableOverviewResponse> findOverview() {
        Map<Long, DiningSessionEntity> openByTableId = diningSessions.findByStatus("OPEN").stream()
                .collect(Collectors.toMap(DiningSessionEntity::getTableId, s -> s, (a, b) -> a));

        return diningTables.findByActiveTrueOrderByTableNoAsc().stream()
                .map(t -> TableOverviewResponse.from(t, openByTableId.get(t.getId())))
                .toList();
    }

    // 清潔完成：CLEANING → AVAILABLE
    @Transactional
    public void clean(Long id) {
        DiningTableEntity table = diningTables.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到桌位"));
        if (!"CLEANING".equals(table.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "這桌不是清潔中");
        }
        table.setStatus("AVAILABLE");
    }

    // S-02b 現場開桌：先鎖住這張桌，避免兩個店員同時開同一桌
    @Transactional
    public TableOverviewResponse open(Long id, Integer adultCount, Integer childCount) {
        DiningTableEntity table = diningTables.findByIdForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到桌位"));
        if (!"AVAILABLE".equals(table.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "此桌已在使用中");
        }

        // status、金額、cartVersion 在 Entity 已有預設值，這裡只填開桌當下才知道的
        DiningSessionEntity session = new DiningSessionEntity();
        session.setTableId(table.getId());
        session.setAdultCount(adultCount);
        session.setChildCount(childCount);
        session.setSessionToken(UUID.randomUUID().toString().replace("-", ""));
        session.setOpenedAt(LocalDateTime.now());
        diningSessions.save(session);

        table.setStatus("OCCUPIED");
        return TableOverviewResponse.from(table, session);
    }
}