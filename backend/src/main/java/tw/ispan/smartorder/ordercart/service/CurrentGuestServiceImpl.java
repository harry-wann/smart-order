package tw.ispan.smartorder.ordercart.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tw.ispan.smartorder.common.exception.ApiException;

@Service
public class CurrentGuestServiceImpl implements CurrentGuestService {

    private final tw.ispan.smartorder.repository.DiningSessionGuestRepository guests;

    public CurrentGuestServiceImpl(tw.ispan.smartorder.repository.DiningSessionGuestRepository guests) {
        this.guests = guests;
    }

    @Override
    public Long requireGuestId(Long sessionId) {

        var attributes = org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
        if (!(attributes instanceof org.springframework.web.context.request.ServletRequestAttributes servlet)) {
            throw invalidGuest();
        }
        var request = servlet.getRequest();
        if (sessionId == null || !sessionId.equals(request.getAttribute("diningSessionId"))) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "無法操作其他桌的購物車"
            );
        }
        // diningGuestId 是 SessionTokenFilter 用 X-Guest-Token 驗過才放進來的；不再用 X-Device-Id 找 guest。
        // 這裡只再確認那位 guest 還在、而且屬於這個用餐 session。
        if (!(request.getAttribute("diningGuestId") instanceof Long guestId)) {
            throw invalidGuest();
        }
        var guest = guests.findById(guestId)
                .filter(g -> sessionId.equals(g.getDiningSessionId()))
                .orElseThrow(this::invalidGuest);
        return guest.getId();
    }

    private ApiException invalidGuest() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_GUEST_TOKEN", "同桌身分已失效，請重新掃碼加入");
    }
}
