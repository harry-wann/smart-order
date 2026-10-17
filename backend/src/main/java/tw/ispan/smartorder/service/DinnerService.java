package tw.ispan.smartorder.service;

import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
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
import tw.ispan.smartorder.util.JwtToken;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class DinnerService {
	private static final String OPEN="OPEN";

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
	public TableStatusResponse status(String tableNo,String deviceId){
		DiningTableEntity table = findTable(tableNo);

		Optional<DiningSessionEntity> session=diningSessionRepo.findFirstByTableIdAndStatusOrderByOpenedAtDesc(table.getId(),OPEN);
		if(session.isEmpty()){
			return new TableStatusResponse(table.getTableNo(),false,false,null);
		}

		boolean joined=diningSessionGuestRepo.existsByDiningSessionIdAndDeviceId(session.get().getId(), deviceId);
		String token = joined ? diningSessionGuestRepo.findByDiningSessionIdAndDeviceId(session.get().getId(), deviceId)
                .map(g -> JwtToken.createGuestToken(g.getDiningSessionId(), g.getId(), deviceId)).orElse(null) : null;
		return new TableStatusResponse(table.getTableNo(),true,joined,token);

	}

	public DiningInfoResponse current(Long sessionId){
		DiningSessionEntity session=diningSessionRepo.findById(sessionId).orElseThrow();
		DiningTableEntity table=dinnerTableRepo.findById(session.getTableId()).orElseThrow();
		return new DiningInfoResponse(sessionId,table.getTableNo());
	}


	@Transactional
	public JoinTableResponse join(String tableNo, String deviceId) {
		if (deviceId == null || deviceId.isBlank() || deviceId.length() > 128) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "缺少有效的裝置識別碼");
        }
		DiningTableEntity table = findTable(tableNo);

		// 鎖住桌位，避免同一裝置同時重複加入。
        dinnerTableRepo.findByIdForUpdate(table.getId()).orElseThrow();
		DiningSessionEntity session = diningSessionRepo.findFirstByTableIdAndStatusOrderByOpenedAtDesc(table.getId(), OPEN)
						.orElseThrow(() -> new IllegalArgumentException("這桌尚未開桌，請洽櫃檯"));

		if (!diningSessionGuestRepo.existsByDiningSessionIdAndDeviceId(session.getId(), deviceId)) {
			long count = diningSessionGuestRepo.countByDiningSessionId(session.getId());

			DiningSessionGuestEntity guest = new DiningSessionGuestEntity();
			guest.setDiningSessionId(session.getId());
			guest.setDeviceId(deviceId);
			guest.setDisplayName("客人 " + (count + 1));
			guest.setJoinedAt(LocalDateTime.now());
			diningSessionGuestRepo.save(guest);
		}

		var currentGuest = diningSessionGuestRepo.findByDiningSessionIdAndDeviceId(session.getId(), deviceId).orElseThrow();
        String token = JwtToken.createGuestToken(session.getId(), currentGuest.getId(), deviceId);
		return new JoinTableResponse(table.getTableNo(), token);
	}

	public DiningInfoResponse currentByToken(String token) {
		Long sessionId = Long.valueOf(JwtToken.parseToken(token));
		return current(sessionId);
	}

}
