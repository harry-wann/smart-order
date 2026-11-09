package tw.ispan.smartorder.service;

import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

// 「到櫃檯結帳」的鎖：記住哪一桌是哪位 guest 正開著櫃檯結帳視窗，期間同桌別人不能線上付款。
// 只存在記憶體，後端重開就等於全部解鎖；讀寫都在 EcpayService 鎖住 dining_session 之後，同桌的操作會排隊。
@Component
public class CounterCheckoutHolds {
    private final ConcurrentHashMap<Long, Long> holders = new ConcurrentHashMap<>();

    public void hold(long sessionId, long guestId) {
        holders.put(sessionId, guestId);
    }

    // 只解開自己的鎖，不會把別人的鎖拿掉
    public void release(long sessionId, long guestId) {
        holders.remove(sessionId, guestId);
    }

    public boolean heldByOther(long sessionId, long guestId) {
        Long holder = holders.get(sessionId);
        return holder != null && holder != guestId;
    }
}
