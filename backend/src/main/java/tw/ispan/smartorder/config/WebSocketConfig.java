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

    public WebSocketConfig(tw.ispan.smartorder.repository.DiningSessionGuestRepository guests,
                           tw.ispan.smartorder.repository.DiningSessionRepository sessions) {
        this.guests = guests;
        this.sessions = sessions;
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
                if (headers.getCommand() == org.springframework.messaging.simp.stomp.StompCommand.CONNECT
                        && headers.getFirstNativeHeader("X-Session-Token") != null) {
                    var identity = tw.ispan.smartorder.util.JwtToken.parseGuestToken(
                            headers.getFirstNativeHeader("X-Session-Token"), headers.getFirstNativeHeader("X-Device-Id"));
                    var guest = guests.findByDiningSessionIdAndDeviceId(identity.sessionId(), identity.deviceId())
                            .filter(g -> g.getId().equals(identity.guestId())).orElseThrow();
                    if (!sessions.findById(identity.sessionId()).map(s -> "OPEN".equals(s.getStatus())).orElse(false)) {
                        throw new IllegalArgumentException("此桌已停止點餐");
                    }
                    headers.setUser(() -> "guest-" + guest.getId());
                }
                if (headers.getCommand() == org.springframework.messaging.simp.stomp.StompCommand.SUBSCRIBE) {
                    String destination = headers.getDestination();
                    // 保留原有桌況公開推播；客人的通知只允許訂閱自己的 queue。
                    if (!"/topic/counter".equals(destination)
                            && !("/user/queue/cart-updates".equals(destination) && headers.getUser() != null)) {
                        throw new IllegalArgumentException("無法訂閱此通知");
                    }
                }
                return message;
            }
        });
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
