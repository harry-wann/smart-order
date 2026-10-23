package tw.ispan.smartorder.dto;

// sessionToken：用餐權杖（X-Session-Token）；guestToken：伺服器簽發的同桌身分權杖（X-Guest-Token），
// 前端兩個一起存，重新進桌時兩個一起帶回來才會恢復同一位 guest。
public record JoinTableResponse(String tableNo, String sessionToken, String guestToken, Guest guest) {

	public record Guest(Long id, String displayName) {
	}
}
