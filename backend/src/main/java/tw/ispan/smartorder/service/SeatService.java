package tw.ispan.smartorder.service;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tw.ispan.smartorder.dto.SeatResponse;
import tw.ispan.smartorder.entity.DiningTableEntity;
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

    @Transactional
    public SeatResponse updateReservable(Long id, Boolean reservable) {
        DiningTableEntity table = diningTables.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到桌位"));
        table.setReservable(reservable);
        return SeatResponse.from(table);
    }
}
