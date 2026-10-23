package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tw.ispan.smartorder.entity.DiningSessionGuestEntity;
import tw.ispan.smartorder.util.GuestToken;

public interface DiningSessionGuestRepository extends JpaRepository<DiningSessionGuestEntity,Long> {
    java.util.List<DiningSessionGuestEntity> findByDiningSessionId(Long sessionId);
	long countByDiningSessionId(Long diningSessionId);
    java.util.Optional<DiningSessionGuestEntity> findByGuestTokenHash(String guestTokenHash);

    // 用伺服器簽發的 X-Guest-Token 找 guest：雜湊對得上、屬於這個用餐 session、
    // 而且就是用餐權杖裡寫的那位 guest，三項都符合才算數，任何一項不符都當作沒找到。
    // 不提供用 deviceId 找 guest 的方法：X-Device-Id 可偽造，只供顯示／診斷。
    default java.util.Optional<DiningSessionGuestEntity> findVerifiedGuest(String guestToken, Long sessionId, Long guestId) {
        if (guestToken == null || guestToken.isBlank() || sessionId == null || guestId == null) {
            return java.util.Optional.empty();
        }
        return findByGuestTokenHash(GuestToken.hash(guestToken))
                .filter(guest -> sessionId.equals(guest.getDiningSessionId()) && guestId.equals(guest.getId()));
    }

}
