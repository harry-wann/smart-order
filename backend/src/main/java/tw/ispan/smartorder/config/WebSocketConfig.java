package tw.ispan.smartorder.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    private final tw.ispan.smartorder.repository.DiningSessionGuestRepository guests;
    private final tw.ispan.smartorder.repository.DiningSessionRepository sessions;
    private final tw.ispan.smartorder.util.JwtToken jwtToken;

    @org.springframework.beans.factory.annotation.Autowired
    private tw.ispan.smartorder.staff.security.StaffJwtProvider staffJwtProvider;

    public WebSocketConfig(tw.ispan.smartorder.repository.DiningSessionGuestRepository guests,
                           tw.ispan.smartorder.repository.DiningSessionRepository sessions,
                           tw.ispan.smartorder.util.JwtToken jwtToken) {
        this.guests = guests;
        this.sessions = sessions;
        this.jwtToken = jwtToken;
    }

    @Override
    public void configureClientInboundChannel(org.springframework.messaging.simp.config.ChannelRegistration registration) {
        registration.interceptors(new org.springframework.messaging.support.ChannelInterceptor() {
            @Override
            public org.springframework.messaging.Message<?> preSend(org.springframework.messaging.Message<?> message,
                    org.springframework.messaging.MessageChannel channel) {
                var headers = org.springframework.messaging.support.MessageHeaderAccessor.getAccessor(message,
                        org.springframework.messaging.simp.stomp.StompHeaderAccessor.class);
                if (headers == null) return message;
                if (headers.getCommand() == org.springframework.messaging.simp.stomp.StompCommand.SEND) {
                    throw new IllegalArgumentException("通知只能由伺服器發送");
                }
                if (headers.getCommand() == org.springframework.messaging.simp.stomp.StompCommand.CONNECT) {
                    String authorization = headers.getFirstNativeHeader("Authorization");
                    if (authorization != null) {
                        if (!authorization.startsWith("Bearer ") || staffJwtProvider == null) {
                            throw new IllegalArgumentException("Invalid staff credentials.");
                        }
                        var staff = staffJwtProvider.parse(authorization.substring("Bearer ".length()));
                        if (staff == null) {
                            throw new IllegalArgumentException("Invalid staff credentials.");
                        }
                        headers.setUser(new StaffWebSocketPrincipal(staff.id(), staff.role()));
                    }
                }
                // 顧客 CONNECT 只驗 X-Session-Token（04 §3.1）：X-Guest-Token 只給 REST 用，不放進 WebSocket；
                // X-Device-Id 可偽造，也不看。guest 列要存在、屬於權杖裡的 session，個人 queue 才用這位 guest 當收件人。
                if (headers.getCommand() == org.springframework.messaging.simp.stomp.StompCommand.CONNECT
                        && headers.getFirstNativeHeader("X-Session-Token") != null) {
                    var identity = jwtToken.parseGuestToken(headers.getFirstNativeHeader("X-Session-Token"));
                    var guest = guests.findById(identity.guestId())
                            .filter(g -> identity.sessionId().equals(g.getDiningSessionId()))
                            .orElseThrow(() -> new IllegalArgumentException("請重新掃碼加入桌位"));
                    if (!sessions.findById(identity.sessionId()).map(s -> "OPEN".equals(s.getStatus())).orElse(false)) {
                        throw new IllegalArgumentException("此桌已停止點餐");
                    }
                    headers.setUser(() -> "guest-" + guest.getId());
                }
                if (headers.getCommand() == org.springframework.messaging.simp.stomp.StompCommand.SUBSCRIBE) {
                    String destination = headers.getDestination();
                    boolean kitchenStaff = "/topic/kitchen".equals(destination)
                            && isKitchenStaff(headers.getUser());
                    boolean waitlistStaff = "/topic/waitlist".equals(destination)
                            && isCounterStaff(headers.getUser());
                    // 櫃檯頻道有桌號、桌況、候位數、用餐超時與待清理提醒、服務鈴，是店內資料，
                    // 只給 CONNECT 時帶員工 JWT 的櫃檯與店長，不再公開給任何連得上 /ws 的人
                    boolean counterStaff = "/topic/counter".equals(destination)
                            && isCounterStaff(headers.getUser());
                    // 櫃檯桌位詳情（S-03）收帳單變動；原本漏了這條，訂閱一律被拒、前端每 5 秒重連一次
                    boolean billingStaff = "/topic/billing".equals(destination)
                            && isCounterStaff(headers.getUser());
                    // 菜單狀態限已連線的客人或員工，購物車通知使用個人 queue。
                    if (!counterStaff
                            && !billingStaff
                            && !("/topic/menu".equals(destination) && headers.getUser() != null)
                            && !("/user/queue/cart-updates".equals(destination) && headers.getUser() != null)
                            && !kitchenStaff
                            && !waitlistStaff) {
                        throw new IllegalArgumentException("無法訂閱此通知");
                    }
                }
                return message;
            }
        });
    }

    private boolean isKitchenStaff(java.security.Principal principal) {
        if (!(principal instanceof StaffWebSocketPrincipal staff)) {
            return false;
        }
        return "KITCHEN".equals(staff.role()) || "MANAGER".equals(staff.role());
    }

    // 櫃檯的頻道（/topic/counter、/topic/waitlist）：櫃檯與店長
    private boolean isCounterStaff(java.security.Principal principal) {
        if (!(principal instanceof StaffWebSocketPrincipal staff)) {
            return false;
        }
        return "COUNTER".equals(staff.role()) || "MANAGER".equals(staff.role());
    }

    private record StaffWebSocketPrincipal(Long id, String role) implements java.security.Principal {
        @Override
        public String getName() {
            return "staff-" + id;
        }
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {

        // 發送給指定使用者的通知
        registry.setUserDestinationPrefix("/user");

        // 訂閱通知目的地
        registry.enableSimpleBroker("/queue", "/topic");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {

        // React 的 WebSocket 連線位置
        registry.addEndpoint("/ws");
    }
}
