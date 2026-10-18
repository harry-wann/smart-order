package tw.ispan.smartorder.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import tw.ispan.smartorder.dto.DiningInfoResponse;
import tw.ispan.smartorder.dto.ServiceCallRequest;
import tw.ispan.smartorder.service.DiningService;
import tw.ispan.smartorder.service.ServiceCallService;

@RestController
@RequestMapping("/api/dining")
public class DiningSessionController {

	@Autowired
	private DiningService dinnerService;

	@Autowired
	private ServiceCallService serviceCallService;

	@GetMapping("/current")
	public DiningInfoResponse current(@RequestAttribute("diningSessionId") long sessionId) {
		return dinnerService.current(sessionId);
	}

	@PostMapping("/service-calls")
	public void serviceCall(@RequestAttribute("diningSessionId") long sessionId,
													@Valid @RequestBody ServiceCallRequest req) {
		serviceCallService.call(sessionId, req.type());
}
}
