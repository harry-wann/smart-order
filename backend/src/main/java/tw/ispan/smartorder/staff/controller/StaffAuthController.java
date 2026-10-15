package tw.ispan.smartorder.staff.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tw.ispan.smartorder.staff.dto.request.StaffLoginRequest;
import tw.ispan.smartorder.staff.dto.response.StaffLoginResponse;
import tw.ispan.smartorder.staff.service.StaffAuthService;

// 原檔名 StaffAuthController.kt

@RestController
@RequestMapping("/api/admin/auth")
@RequiredArgsConstructor
public class StaffAuthController {

    private final StaffAuthService service;

    @PostMapping("/login")
    public StaffLoginResponse login(@Valid @RequestBody StaffLoginRequest request) {
        return service.login(request);
    }
}
