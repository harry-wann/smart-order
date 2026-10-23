package tw.ispan.smartorder.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import tw.ispan.smartorder.dto.JoinTableResponse;
import tw.ispan.smartorder.dto.TableStatusResponse;
import tw.ispan.smartorder.service.DiningService;

@RestController
@RequestMapping("/api/tables")
public class DiningController {

	@Autowired
	private DiningService diningService;

	@GetMapping("/{tableNo}/status")
	public TableStatusResponse status(@PathVariable String tableNo) {
		return diningService.status(tableNo);
	}

	// 首次加入不用帶權杖；重新進桌時把手上的 X-Session-Token 與 X-Guest-Token 一起帶來，才會恢復原本的 guest。
	// X-Device-Id 選填，只存來顯示／診斷，不參與身分判斷。
	@PostMapping("/{tableNo}/join")
	public JoinTableResponse join(@PathVariable String tableNo,
								@RequestHeader(value = "X-Device-Id", required = false) String deviceId,
								@RequestHeader(value = "X-Session-Token", required = false) String sessionToken,
								@RequestHeader(value = "X-Guest-Token", required = false) String guestToken) {
		return diningService.join(tableNo, deviceId, sessionToken, guestToken);
	}
}
