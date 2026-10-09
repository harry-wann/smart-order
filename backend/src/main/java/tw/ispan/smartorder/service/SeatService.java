package tw.ispan.smartorder.service;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tw.ispan.smartorder.dto.SeatResponse;
import tw.ispan.smartorder.repository.DiningTableRepository;

@Service
@Transactional(readOnly = true)
public class SeatService {

    @Autowired
    private DiningTableRepository diningTables;

    public List<SeatResponse> findAll() {
        return diningTables.findByActiveTrueOrderByTableNoAsc().stream()
                .map(SeatResponse::from)
                .toList();
    }
}