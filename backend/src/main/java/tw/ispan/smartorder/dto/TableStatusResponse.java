package tw.ispan.smartorder.dto;

// 掃碼後第一支（公開、不需權杖）：只說這桌有沒有開桌。
// 不回任何權杖，也不回「這支手機是否已加入」——那要靠 X-Guest-Token 才能證明，請改走 join 恢復身分。
public record TableStatusResponse(
				String tableNo,
				boolean open
) {
}
