package tw.ispan.smartorder.controller;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;
import tw.ispan.smartorder.repository.DiningSessionRepository;
import tw.ispan.smartorder.repository.DiningSessionGuestRepository;
import tw.ispan.smartorder.util.JwtToken;

import java.io.IOException;

public class SessionTokenFilter extends OncePerRequestFilter {
	private final DiningSessionRepository sessionRepo;
	private final DiningSessionGuestRepository guestRepo;
	private final JwtToken jwtToken;

	public SessionTokenFilter(DiningSessionRepository sessionRepo, DiningSessionGuestRepository guestRepo,
							  JwtToken jwtToken){
		this.sessionRepo=sessionRepo;
		this.guestRepo=guestRepo;
		this.jwtToken=jwtToken;
	}

	@Override
	protected boolean shouldNotFilter(HttpServletRequest request){
		String requestUri = request.getRequestURI();
		return !requestUri.startsWith("/api/dining/")
                && !requestUri.startsWith("/api/dining-sessions/")
                && !requestUri.startsWith("/api/order-tickets/")
                && !requestUri.equals("/api/order/cart/items");
	}

	// 顧客端身分分兩層：
	// 1. X-Session-Token（用餐權杖，JWT）：坐哪一桌、自稱哪位 guest
	// 2. X-Guest-Token（伺服器簽發的亂數）：證明真的是那位 guest；用雜湊查 guest 列，要屬於同一個 session、同一位 guest
	// X-Device-Id 可偽造，這裡完全不看。
	@Override
	protected void doFilterInternal(HttpServletRequest request,
																	HttpServletResponse response,
																	FilterChain chain)throws ServletException, IOException{
		String token=request.getHeader("X-Session-Token");

		Long sessionId;
		Long guestId;
		try {
			var identity = jwtToken.parseGuestToken(token);
            sessionId = identity.sessionId();
            guestId = identity.guestId();

		}catch (JwtException|IllegalArgumentException e){
			reject(response);
			return;
		}

		// 先驗 guest token 再看 session 狀態：沒有本人權杖的請求，連這桌結帳了沒都不告訴它
		boolean validGuest = guestRepo.findVerifiedGuest(request.getHeader("X-Guest-Token"), sessionId, guestId)
				.isPresent();
		if (!validGuest) {
			rejectGuest(response);
			return;
		}

		String sessionStatus = sessionRepo.findById(sessionId)
						.map(s -> s.getStatus())
						.orElse(null);
		if (!"OPEN".equals(sessionStatus)) {
			String reason = "PAID".equals(sessionStatus) || "CANCELLED".equals(sessionStatus)
					? sessionStatus : null;
			reject(response, reason);
			return;
		}

		// 兩個屬性都是驗過 guest token 才放；CurrentGuestServiceImpl 只認這裡放進去的 guest id
		request.setAttribute("diningSessionId",sessionId);
		request.setAttribute("diningGuestId",guestId);
		chain.doFilter(request,response);
	}

	private void reject(HttpServletResponse response)throws IOException{
		reject(response, null);
	}

	private void reject(HttpServletResponse response, String reason)throws IOException{
		writeUnauthorized(response, "INVALID_SESSION_TOKEN", "點餐憑證已失效，請重新掃碼", reason);
	}

	// 沒帶 X-Guest-Token，或它不屬於這張用餐權杖的 session／guest
	private void rejectGuest(HttpServletResponse response)throws IOException{
		writeUnauthorized(response, "INVALID_GUEST_TOKEN", "同桌身分已失效，請重新掃碼加入", null);
	}

	private void writeUnauthorized(HttpServletResponse response, String code, String message, String reason)
			throws IOException{
		response.setStatus(401);
		response.setContentType("application/json;charset=UTF-8");
		response.getWriter().write(
						"{\"status\":401,\"code\":\"" + code + "\",\"message\":\"" + message + "\""
								+ (reason == null ? "" : ",\"reason\":\"" + reason + "\"") + "}"
		);
	}

}
