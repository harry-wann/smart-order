package tw.ispan.smartorder.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tw.ispan.smartorder.dto.TableOverviewResponse;
import tw.ispan.smartorder.entity.DiningSession;
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
}