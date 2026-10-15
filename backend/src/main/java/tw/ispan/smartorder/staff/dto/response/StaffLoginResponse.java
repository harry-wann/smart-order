package tw.ispan.smartorder.staff.dto.response;

import java.time.OffsetDateTime;

// 原檔名 StaffLoginResponse.kt

public record StaffLoginResponse(
        String token,
        OffsetDateTime expiresAt,
        StaffResponse staff
) {
}
