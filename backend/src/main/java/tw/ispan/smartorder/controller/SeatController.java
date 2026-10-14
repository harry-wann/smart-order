package tw.ispan.smartorder.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tw.ispan.smartorder.dto.SeatResponse;
import tw.ispan.smartorder.service.SeatService;

@RestController
@RequestMapping("/api/admin/tables-config")
public class SeatController {

    @Autowired
    private SeatService seatService;

    @GetMapping
    public List<SeatResponse> findAll() {
        return seatService.findAll();
    }
}