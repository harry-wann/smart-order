package tw.ispan.smartorder.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import tw.ispan.smartorder.dto.JoinTableResponse;
import tw.ispan.smartorder.dto.TableStatusResponse;
import tw.ispan.smartorder.service.DinnerService;

@RestController
@RequestMapping("/api/tables")
public class DiningController {

	@Autowired
	private DinnerService diningService;

	@GetMapping("/{tableNo}/status")
	public TableStatusResponse status(@PathVariable String tableNo,
																		@RequestHeader("X-Device-Id") String deviceId) {
		return diningService.status(tableNo, deviceId);
	}

	@PostMapping("/{tableNo}/join")
	public JoinTableResponse join(@PathVariable String tableNo,
																@RequestHeader("X-Device-Id") String deviceId) {
		return diningService.join(tableNo, deviceId);
	}
}
