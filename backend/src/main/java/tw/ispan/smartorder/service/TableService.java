package tw.ispan.smartorder.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tw.ispan.smartorder.dto.TableOverviewResponse;
import tw.ispan.smartorder.entity.DiningSession;
import tw.ispan.smartorder.entity.DiningTable;
import tw.ispan.smartorder.repository.DiningSessionRepository;
import tw.ispan.smartorder.repository.DiningTableRepository;

@Service
@Transactional(readOnly = true)
public class TableService {

    @Autowired
    private DiningTableRepository diningTables;

    @Autowired
    private DiningSessionRepository diningSessions;

    public List<TableOverviewResponse> findOverview() {
        // 1. 撈出所有正在用餐（OPEN）的紀錄，做成「桌子 id → 用餐紀錄」的對照表
        Map<Long, DiningSession> openSessionByTableId = diningSessions.findByStatus("OPEN").stream()
                .collect(Collectors.toMap(s -> s.getTable().getId(), s -> s, (a, b) -> a));

        // 2. 每張桌子去對照表找自己的用餐紀錄（空桌找不到就是 null）
        return diningTables.findByActiveTrueOrderByTableNoAsc().stream()
                .map(table -> TableOverviewResponse.from(table, openSessionByTableId.get(table.getId())))
                .toList();
    }

    @Transactional
    public void clean(Long id) {
        DiningTable table = diningTables.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到桌位"));

        if (!"CLEANING".equals(table.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "這張桌不是待清理狀態");
        }

        table.setStatus("AVAILABLE");
    }

    @Transactional
    public TableOverviewResponse open(Long id, Integer adultCount, Integer childCount) {
        // 1. 查桌子，同時鎖住（別人要開同一桌，會在這裡排隊等）
        DiningTable table = diningTables.findByIdForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到桌位"));

        // 2. 鎖住之後再檢查：一定要是空桌
        if (!"AVAILABLE".equals(table.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "此桌已在使用中");
        }

        // 3. 新增一筆用餐紀錄
        DiningSession session = diningSessions.save(DiningSession.open(table, adultCount, childCount));

        // 4. 桌子改成用餐中
        table.setStatus("OCCUPIED");

        return TableOverviewResponse.from(table, session);
    }

}