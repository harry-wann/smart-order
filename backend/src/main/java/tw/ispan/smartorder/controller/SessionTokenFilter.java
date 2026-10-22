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

	public SessionTokenFilter(DiningSessionRepository sessionRepo, DiningSessionGuestRepository guestRepo){
		this.sessionRepo=sessionRepo;
		this.guestRepo=guestRepo;
	}

	@Override
	protected boolean shouldNotFilter(HttpServletRequest request){
		String requestUri = request.getRequestURI();
		return !requestUri.startsWith("/api/dining/")
                && !requestUri.startsWith("/api/dining-sessions/")
                && !requestUri.startsWith("/api/order-tickets/")
                && !requestUri.equals("/api/order/cart/items");
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request,
																	HttpServletResponse response,
																	FilterChain chain)throws ServletException, IOException{
		String token=request.getHeader("X-Session-Token");

		Long sessionId;
		Long guestId;
		try {
			var identity = JwtToken.parseGuestToken(token, request.getHeader("X-Device-Id"));
            sessionId = identity.sessionId();
            guestId = identity.guestId();

		}catch (JwtException|IllegalArgumentException e){
			reject(response);
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
		if (request.getRequestURI().startsWith("/api/order-tickets/")) {
			boolean validGuest = guestRepo.findById(guestId)
					.filter(guest -> sessionId.equals(guest.getDiningSessionId())
							&& request.getHeader("X-Device-Id").equals(guest.getDeviceId()))
					.isPresent();
			if (!validGuest) {
				reject(response);
				return;
			}
		}

		request.setAttribute("diningSessionId",sessionId);
		request.setAttribute("diningGuestId",guestId);
		chain.doFilter(request,response);
	}

	private void reject(HttpServletResponse response)throws IOException{
		reject(response, null);
	}

	private void reject(HttpServletResponse response, String reason)throws IOException{
		response.setStatus(401);
		response.setContentType("application/json;charset=UTF-8");
		response.getWriter().write(
						"{\"status\":401,\"code\":\"INVALID_SESSION_TOKEN\",\"message\":\"點餐憑證已失效，請重新掃碼\""
								+ (reason == null ? "" : ",\"reason\":\"" + reason + "\"") + "}"
		);
	}

}
