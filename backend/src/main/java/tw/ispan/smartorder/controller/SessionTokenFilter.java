package tw.ispan.smartorder.controller;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;
import tw.ispan.smartorder.repository.DiningSessionRepository;
import tw.ispan.smartorder.util.JwtToken;

import java.io.IOException;

public class SessionTokenFilter extends OncePerRequestFilter {
	private final DiningSessionRepository sessionRepo;

	public SessionTokenFilter(DiningSessionRepository sessionRepo){
		this.sessionRepo=sessionRepo;
	}

	@Override
	protected boolean shouldNotFilter(HttpServletRequest request){
		String requestUri = request.getRequestURI();
		return !requestUri.startsWith("/api/dining/")
                && !requestUri.startsWith("/api/dining-sessions/")
                && !requestUri.equals("/api/order/cart/items");
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request,
																	HttpServletResponse response,
																	FilterChain chain)throws ServletException, IOException{
		String token=request.getHeader("X-Session-Token");

		Long sessionId;
		try {
			var identity = JwtToken.parseGuestToken(token, request.getHeader("X-Device-Id"));
            sessionId = identity.sessionId();
            request.setAttribute("diningGuestId", identity.guestId());

		}catch (JwtException|IllegalArgumentException e){
			reject(response);
			return;
		}

		boolean open=sessionRepo.findById(sessionId)
						.map(s->"OPEN".equals(s.getStatus()))
						.orElse(false);

		if(!open){
			reject(response);
			return;
		}

		request.setAttribute("diningSessionId",sessionId);
		chain.doFilter(request,response);
	}

	private void reject(HttpServletResponse response)throws IOException{
		response.setStatus(401);
		response.setContentType("application/json;charset=UTF-8");
		response.getWriter().write(
						"{\"status\":401,\"code\":\"INVALID_SESSION_TOKEN\",\"message\":\"點餐憑證已失效，請重新掃碼\"}"
		);
	}

}
