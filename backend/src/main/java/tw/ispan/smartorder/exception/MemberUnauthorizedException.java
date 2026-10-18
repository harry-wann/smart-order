package tw.ispan.smartorder.exception;

public class MemberUnauthorizedException extends RuntimeException {
	public MemberUnauthorizedException() {
		super("請重新登入會員");
	}
}
