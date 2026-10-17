package tw.ispan.smartorder.ordercart.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

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
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "請重新掃碼加入桌位");
        }
        var request = servlet.getRequest();
        if (sessionId == null || !sessionId.equals(request.getAttribute("diningSessionId"))) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "無法操作其他桌的購物車"
            );
        }
        var guest = guests.findByDiningSessionIdAndDeviceId(sessionId, request.getHeader("X-Device-Id"))
                .filter(g -> g.getId().equals(request.getAttribute("diningGuestId")))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "請重新掃碼加入桌位"));
        return guest.getId();
    }
}
