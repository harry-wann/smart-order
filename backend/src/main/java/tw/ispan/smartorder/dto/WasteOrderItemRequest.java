package tw.ispan.smartorder.dto;

// 出菜看板「報廢細項」的 body：{ "reason": "煮過頭" }，原因必填、最多 100 字（由 service 檢查）
public record WasteOrderItemRequest(
        String reason
) {
}
