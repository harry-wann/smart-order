package tw.ispan.smartorder.service;

import io.jsonwebtoken.JwtException;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import tw.ispan.smartorder.common.exception.ApiException;
import tw.ispan.smartorder.dto.DiningInfoResponse;
import tw.ispan.smartorder.dto.JoinTableResponse;
import tw.ispan.smartorder.dto.TableStatusResponse;
import tw.ispan.smartorder.entity.DiningSessionEntity;
import tw.ispan.smartorder.entity.DiningSessionGuestEntity;
import tw.ispan.smartorder.entity.DiningTableEntity;
import tw.ispan.smartorder.exception.TableNoFoundException;
import tw.ispan.smartorder.repository.DiningSessionRepository;
import tw.ispan.smartorder.repository.DiningSessionGuestRepository;
import tw.ispan.smartorder.repository.DiningTableRepository;
import tw.ispan.smartorder.util.GuestToken;
import tw.ispan.smartorder.util.JwtToken;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class DiningService {
	private static final String OPEN="OPEN";
	// 跟資料表 dining_session_guest.device_id VARCHAR(36) 一致，超過就回 400，不要等資料庫報錯
	private static final int DEVICE_ID_MAX_LENGTH = 36;

	@Autowired
	private DiningSessionRepository diningSessionRepo;
	@Autowired
	private DiningTableRepository dinnerTableRepo;
	@Autowired
	private DiningSessionGuestRepository diningSessionGuestRepo;

	private DiningTableEntity findTable(String tableNo) {
		return dinnerTableRepo.findByTableNo(tableNo)
						.orElseThrow(() -> new TableNoFoundException(tableNo));
	}
	// 公開查詢：不看 X-Device-Id、不簽發任何權杖；要拿身分一律走 join
	public TableStatusResponse status(String tableNo){
		DiningTableEntity table = findTable(tableNo);

		boolean open = diningSessionRepo.findFirstByTableIdAndStatusOrderByOpenedAtDesc(table.getId(), OPEN).isPresent();
		return new TableStatusResponse(table.getTableNo(), open);
	}

	public DiningInfoResponse current(Long sessionId){
		DiningSessionEntity session=diningSessionRepo.findById(sessionId).orElseThrow();
		DiningTableEntity table=dinnerTableRepo.findById(session.getTableId()).orElseThrow();
		return new DiningInfoResponse(sessionId, table.getTableNo(), session.getAdultCount(),
                session.getChildCount(), session.getOpenedAt());
	}


	// 掃碼加入：同時帶本 session 的 X-Session-Token 與既有 X-Guest-Token 才恢復原本那位 guest，
	// 其餘情況（沒帶、過期、別桌的、對不上）一律建立新 guest——就算 X-Device-Id 一樣也不會沿用。
	// deviceId 選填，只存起來顯示／診斷用。
	@Transactional
	public JoinTableResponse join(String tableNo, String deviceId, String sessionToken, String guestToken) {
		if (deviceId != null && deviceId.isBlank()) {
			deviceId = null;
		}
		if (deviceId != null && deviceId.length() > DEVICE_ID_MAX_LENGTH) {
			throw ApiException.badRequest("裝置識別碼格式不正確");
		}
		DiningTableEntity table = findTable(tableNo);

		// 鎖住桌位，同一桌同時加入的人一個一個來，「客人 N」的編號才不會重複。
        dinnerTableRepo.findByIdForUpdate(table.getId()).orElseThrow();
		DiningSessionEntity session = diningSessionRepo.findFirstByTableIdAndStatusOrderByOpenedAtDesc(table.getId(), OPEN)
						.orElseThrow(() -> new IllegalArgumentException("這桌尚未開桌，請洽櫃檯"));

		Optional<DiningSessionGuestEntity> returning = findReturningGuest(session.getId(), sessionToken, guestToken);
		if (returning.isPresent()) {
			DiningSessionGuestEntity guest = returning.get();
			// 原本的 guest token 已經驗過雜湊，原樣交回；用餐權杖重新簽一張
			return joinResponse(table, guest, guestToken);
		}

		long count = diningSessionGuestRepo.countByDiningSessionId(session.getId());
		String newGuestToken = GuestToken.generate();

		DiningSessionGuestEntity guest = new DiningSessionGuestEntity();
		guest.setDiningSessionId(session.getId());
		guest.setDeviceId(deviceId);
		guest.setGuestTokenHash(GuestToken.hash(newGuestToken));
		guest.setDisplayName("客人 " + (count + 1));
		guest.setJoinedAt(LocalDateTime.now());
		diningSessionGuestRepo.save(guest);

		return joinResponse(table, guest, newGuestToken);
	}

	// 兩個權杖都要有：用餐權杖屬於這桌目前的 session，guest token 的雜湊也對到權杖裡那位 guest
	private Optional<DiningSessionGuestEntity> findReturningGuest(Long sessionId, String sessionToken, String guestToken) {
		if (sessionToken == null || sessionToken.isBlank() || guestToken == null || guestToken.isBlank()) {
			return Optional.empty();
		}
		JwtToken.GuestIdentity identity;
		try {
			identity = JwtToken.parseGuestToken(sessionToken);
		} catch (JwtException | IllegalArgumentException e) {
			return Optional.empty();
		}
		if (!sessionId.equals(identity.sessionId())) {
			return Optional.empty();
		}
		return diningSessionGuestRepo.findVerifiedGuest(guestToken, sessionId, identity.guestId());
	}

	private JoinTableResponse joinResponse(DiningTableEntity table, DiningSessionGuestEntity guest, String guestToken) {
		String token = JwtToken.createGuestToken(guest.getDiningSessionId(), guest.getId());
		return new JoinTableResponse(table.getTableNo(), token, guestToken,
				new JoinTableResponse.Guest(guest.getId(), guest.getDisplayName()));
	}

	public DiningInfoResponse currentByToken(String token) {
		Long sessionId = Long.valueOf(JwtToken.parseToken(token));
		return current(sessionId);
	}

}
