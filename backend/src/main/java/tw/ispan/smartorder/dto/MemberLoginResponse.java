package tw.ispan.smartorder.dto;

public record MemberLoginResponse(String token, boolean profileCompleted, boolean newMember, String nickname) {
	
}