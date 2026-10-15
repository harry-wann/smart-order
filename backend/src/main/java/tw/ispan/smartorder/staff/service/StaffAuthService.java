package tw.ispan.smartorder.staff.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tw.ispan.smartorder.common.exception.ApiException;
import tw.ispan.smartorder.entity.StaffEntity;
import tw.ispan.smartorder.staff.dto.request.StaffLoginRequest;
import tw.ispan.smartorder.staff.dto.response.StaffLoginResponse;
import tw.ispan.smartorder.staff.dto.response.StaffResponse;
import tw.ispan.smartorder.staff.repository.StaffRepository;
import tw.ispan.smartorder.staff.security.StaffJwtProvider;
import tw.ispan.smartorder.staff.security.StaffPrincipal;

import java.time.ZoneId;

// 原檔名 StaffAuthService.kt

@Service
@RequiredArgsConstructor
public class StaffAuthService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Taipei");
    private static final BCryptPasswordEncoder PASSWORD_ENCODER = new BCryptPasswordEncoder();
    // 強度要跟資料庫裡真的 hash 一樣（預設 10），不然假比對花的時間不同，等於白做；
    // 放在這裡啟動時算一次，不要每次登入現算
    private static final String DUMMY_HASH = PASSWORD_ENCODER.encode("not-a-real-password");

    private final StaffRepository staffRepo;
    private final StaffJwtProvider jwtProvider;

    @Transactional(readOnly = true)
    public StaffLoginResponse login(StaffLoginRequest request) {
        StaffEntity staff = staffRepo.findByUsernameAndActiveTrue(request.username().strip()).orElse(null);
        // 帳號不存在、被停用、密碼錯，三種都回同一句「帳號或密碼錯誤」，不讓人從訊息試出哪些帳號存在。
        // 光訊息一樣還不夠：BCrypt 故意算很慢，帳號不存在如果直接回，會比密碼錯快上一截，
        // 量回應時間一樣猜得出來。所以不存在時也拿假的 hash 比對一次，兩條路花的時間差不多
        boolean matched = PASSWORD_ENCODER.matches(
                request.password(), staff != null ? staff.getPasswordHash() : DUMMY_HASH);
        if (staff == null || !matched) {
            throw ApiException.unauthorized("帳號或密碼錯誤");
        }
        StaffPrincipal principal = new StaffPrincipal(staff.getId(), staff.getDisplayName(), staff.getRole());
        StaffJwtProvider.IssuedToken issued = jwtProvider.create(principal);
        return new StaffLoginResponse(
                issued.token(),
                issued.expiresAt().atZone(ZONE).toOffsetDateTime(),
                new StaffResponse(principal.id(), principal.displayName(), principal.role()));
    }
}
