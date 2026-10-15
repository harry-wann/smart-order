package tw.ispan.smartorder.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.OffsetDateTime;
import java.util.List;

// 原檔名 ErrorResponse.kt

// NON_EMPTY：details 是空的就整個欄位不輸出，一般錯誤不會多一個 "details": []；
// SecurityConfig 手寫的 401／403 本來就沒有 details，兩邊的錯誤前端可以用同一套解析
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ErrorResponse(
        OffsetDateTime timestamp,
        int status,
        String code,
        String message,
        String path,
        // 只有欄位驗證失敗才有，一個欄位一筆，前端放在對應的輸入框底下
        List<ErrorDetail> details
) {
}
