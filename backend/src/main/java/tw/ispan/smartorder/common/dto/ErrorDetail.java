package tw.ispan.smartorder.common.dto;

// 原檔名 ErrorResponse.kt

public record ErrorDetail(
        String field,
        String message
) {
}
