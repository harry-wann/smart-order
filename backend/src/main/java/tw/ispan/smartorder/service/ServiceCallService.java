package tw.ispan.smartorder.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import java.util.UUID;

@Service
public class ServiceCallService {

	public record ServiceCallMessage(String type, String id, String tableNo, String request) {}

	private final SimpMessagingTemplate messagingTemplate;
	private final DiningService diningService;

	public ServiceCallService(SimpMessagingTemplate messagingTemplate, DiningService diningService) {
		this.messagingTemplate = messagingTemplate;
		this.diningService = diningService;
	}

	public void call(Long sessionId, String request) {
		String tableNo = diningService.current(sessionId).tableNo();

		ServiceCallMessage message = new ServiceCallMessage(
						"SERVICE_CALL",
						UUID.randomUUID().toString(),   
						tableNo,
						request);

		messagingTemplate.convertAndSend(TableStatusNotifier.COUNTER_TOPIC, message);
	}
}