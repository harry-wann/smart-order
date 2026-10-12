package tw.ispan.smartorder.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tw.ispan.smartorder.dto.WaitlistResponse;
import tw.ispan.smartorder.service.WaitlistService;

@RestController
@RequestMapping("/api/admin/waitlist")
public class WaitlistController {

    @Autowired
    private WaitlistService waitlistService;

    @GetMapping
    public List<WaitlistResponse> findActive() {
        return waitlistService.findActive();
    }
}