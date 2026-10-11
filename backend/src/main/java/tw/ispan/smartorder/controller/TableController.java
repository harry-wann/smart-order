package tw.ispan.smartorder.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import tw.ispan.smartorder.dto.TableOverviewResponse;
import tw.ispan.smartorder.service.TableService;

@RestController
@RequestMapping("/api/admin/tables")
public class TableController {

    @Autowired
    private TableService tableService;

    @GetMapping
    public List<TableOverviewResponse> findOverview() {
        return tableService.findOverview();
    }

    @PostMapping("/{id}/clean")
    public void clean(@PathVariable Long id) {
        tableService.clean(id);
    }

}