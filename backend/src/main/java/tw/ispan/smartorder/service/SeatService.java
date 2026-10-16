package tw.ispan.smartorder.service;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tw.ispan.smartorder.dto.SeatRequest;
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

    // S-08 新增桌位：新桌一律是空桌、開放預約、啟用中
    @Transactional
    public SeatResponse create(SeatRequest request) {
        String tableNo = validate(request);
        if (diningTables.findByTableNo(tableNo).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "桌號 " + tableNo + " 已經有了");
        }

        DiningTableEntity table = new DiningTableEntity();
        table.setTableNo(tableNo);
        table.setSeats(request.seats());
        table.setArea(request.area().trim());
        table.setStatus("AVAILABLE");
        table.setReservable(true);
        table.setActive(true);
        return SeatResponse.from(diningTables.save(table));
    }

    // S-08 編輯桌位：改桌號時，不能跟「別張」桌重複
    @Transactional
    public SeatResponse update(Long id, SeatRequest request) {
        DiningTableEntity table = diningTables.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到桌位"));
        String tableNo = validate(request);
        diningTables.findByTableNo(tableNo)
                .filter(other -> !other.getId().equals(id))
                .ifPresent(other -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "桌號 " + tableNo + " 已經有了");
                });

        table.setTableNo(tableNo);
        table.setSeats(request.seats());
        table.setArea(request.area().trim());
        return SeatResponse.from(table);
    }

    // 檢查必填和範圍，回傳整理過的桌號（去空白、轉大寫：a01 → A01）
    private String validate(SeatRequest request) {
        if (request.tableNo() == null || request.tableNo().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "請填桌號");
        }
        if (request.seats() == null || request.seats() < 1 || request.seats() > 20) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "座位數要在 1～20 之間");
        }
        if (request.area() == null || request.area().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "請填區域");
        }
        return request.tableNo().trim().toUpperCase();
    }

}
