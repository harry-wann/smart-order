package tw.ispan.smartorder.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tw.ispan.smartorder.dto.DiningInfoResponse;
import tw.ispan.smartorder.service.DinnerService;

@RestController
@RequestMapping("/api/dining")
public class DiningSessionController {

	@Autowired
	private DinnerService dinnerService;

	@GetMapping("/current")
	public DiningInfoResponse current(@RequestAttribute("diningSessionId") long sessionId) {
		return dinnerService.current(sessionId);
	}
}
