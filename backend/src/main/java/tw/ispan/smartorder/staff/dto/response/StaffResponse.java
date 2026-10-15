package tw.ispan.smartorder.staff.dto.response;

// 原檔名 StaffLoginResponse.kt

public record StaffResponse(
        Long id,
        String displayName,
        String role
) {
}
