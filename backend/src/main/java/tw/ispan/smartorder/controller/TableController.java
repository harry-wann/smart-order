package tw.ispan.smartorder.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import tw.ispan.smartorder.dto.OpenTableRequest;
import tw.ispan.smartorder.dto.TableOverviewResponse;
import tw.ispan.smartorder.service.QrCodeService;
import tw.ispan.smartorder.service.TableService;

@RestController
@RequestMapping("/api/admin/tables")
public class TableController {

    @Autowired
    private TableService tableService;

    @Autowired
    private QrCodeService qrCodeService;

    @GetMapping
    public List<TableOverviewResponse> findOverview() {
        return tableService.findOverview();
    }

    @PostMapping("/{id}/clean")
    public void clean(@PathVariable Long id) {
        tableService.clean(id);
    }

    @PostMapping("/{id}/open")
    public TableOverviewResponse open(@PathVariable Long id, @RequestBody OpenTableRequest request) {
        return tableService.open(id, request.adultCount(), request.childCount());
    }

    // S-08 補印 QR：GET /api/admin/tables/{id}/qrcode，直接回傳 PNG 圖片
    @GetMapping(value = "/{id}/qrcode", produces = MediaType.IMAGE_PNG_VALUE)
    public byte[] qrcode(@PathVariable Long id) {
        return qrCodeService.tablePng(id);
    }

}