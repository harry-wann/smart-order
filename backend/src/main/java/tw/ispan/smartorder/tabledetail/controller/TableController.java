package tw.ispan.smartorder.tabledetail.controller;

import tw.ispan.smartorder.tabledetail.dto.CheckoutRequest;
import tw.ispan.smartorder.tabledetail.dto.TableDetailResponse;
import tw.ispan.smartorder.tabledetail.service.TableService;

import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/tables")
//http://localhost:8080/api/tables/A03/detail
public class TableController {

    private final TableService service;

    public TableController(TableService service) {
        this.service = service;
    }

    // 取得桌位詳細資料
    @GetMapping("/{tableNumber}/detail")
    public TableDetailResponse getDetail(
            @PathVariable String tableNumber
    ) {
        return service.getDetail(tableNumber);
    }

    // 結帳
    @PostMapping("/{tableNumber}/checkout")
    public Map<String, Object> checkout(
            @PathVariable String tableNumber,
            @RequestBody CheckoutRequest request
    ) {
        service.checkout(
                tableNumber, request.paymentMethod()
        );

        return Map.of(
                "success", true,
                "message", "模擬結帳成功"
        );
    }
}