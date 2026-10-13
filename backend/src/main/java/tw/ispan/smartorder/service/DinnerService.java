package tw.ispan.smartorder.service;

import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import tw.ispan.smartorder.dto.DiningInfoResponse;
import tw.ispan.smartorder.dto.JoinTableResponse;
import tw.ispan.smartorder.dto.TableStatusResponse;
import tw.ispan.smartorder.entity.DiningSession;
import tw.ispan.smartorder.entity.DiningSessionGuest;
import tw.ispan.smartorder.entity.DiningTable;
import tw.ispan.smartorder.exception.TableNoFoundException;
import tw.ispan.smartorder.repository.DingingSessionRepository;
import tw.ispan.smartorder.repository.DiningSessionGuestRepository;
import tw.ispan.smartorder.repository.DinnerTableRepository;
import tw.ispan.smartorder.util.JwtToken;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class DinnerService {
	private static final String OPEN="OPEN";

	@Autowired
	private DingingSessionRepository diningSessionRepo;
	@Autowired
	private DinnerTableRepository dinnerTableRepo;
	@Autowired
	private DiningSessionGuestRepository diningSessionGuestRepo;

	private DiningTable findTable(String tableNo) {
		return dinnerTableRepo.findByTableNo(tableNo)
						.orElseThrow(() -> new TableNoFoundException(tableNo));
	}
	public TableStatusResponse status(String tableNo,String deviceId){
		DiningTable table = findTable(tableNo);

		Optional<DiningSession> session=diningSessionRepo.findByTableIdAndStatus(table.getId(),OPEN);
		if(session.isEmpty()){
			return new TableStatusResponse(table.getTableNo(),false,false,null);
		}

		boolean joined=diningSessionGuestRepo.existsByDiningSessionIdAndDeviceId(session.get().getId(), deviceId);
		String token = joined ? JwtToken.createToken(String.valueOf(session.get().getId())) : null;
		return new TableStatusResponse(table.getTableNo(),true,joined,token);

	}

	public DiningInfoResponse current(Long sessionId){
		DiningSession session=diningSessionRepo.findById(sessionId).orElseThrow();
		DiningTable table=dinnerTableRepo.findById(session.getTableId()).orElseThrow();
		return new DiningInfoResponse(sessionId,table.getTableNo());
	}


	@Transactional
	public JoinTableResponse join(String tableNo, String deviceId) {
		DiningTable table = findTable(tableNo);

		DiningSession session = diningSessionRepo.findByTableIdAndStatus(table.getId(), OPEN)
						.orElseThrow(() -> new IllegalArgumentException("這桌尚未開桌，請洽櫃檯"));

		if (!diningSessionGuestRepo.existsByDiningSessionIdAndDeviceId(session.getId(), deviceId)) {
			long count = diningSessionGuestRepo.countByDiningSessionId(session.getId());

			DiningSessionGuest guest = new DiningSessionGuest();
			guest.setDiningSessionId(session.getId());
			guest.setDeviceId(deviceId);
			guest.setDisplayName("客人 " + (count + 1));
			guest.setJoinedAt(LocalDateTime.now());
			diningSessionGuestRepo.save(guest);
		}

		String token = JwtToken.createToken(String.valueOf(session.getId()));
		return new JoinTableResponse(table.getTableNo(), token);
	}
}
