package tw.ispan.smartorder.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tw.ispan.smartorder.dto.*;
import tw.ispan.smartorder.service.MemberAuthService;

@RestController
@RequestMapping("/api/member")
public class MemberAuthController {

	@Autowired
	private MemberAuthService memberAuthService;

	@PostMapping("/otp")
	public SendCodeResponse sendCode(@Valid @RequestBody SendCodeRequest request) {
		return new SendCodeResponse(memberAuthService.sendCode(request.phone()));
	}

	@PostMapping("/verify")
	public MemberLoginResponse verify(@Valid @RequestBody VerifyCodeRequest request) {
		return memberAuthService.login(request.phone(), request.code());
	}

	@PutMapping("/me/profile")
	public ResponseEntity<Void> updateProfile(@RequestHeader(value = "Authorization", required = false) String auth,
																						@Valid @RequestBody UpdateProfileRequest request) {
		Long memberId = memberAuthService.memberIdFromHeader(auth);
		memberAuthService.updateProfile(memberId, request);
		return ResponseEntity.noContent().build();
	}

	@GetMapping("/me")
	public MemberProfileResponse me(@RequestHeader(value = "Authorization", required = false) String auth) {
		Long memberId = memberAuthService.memberIdFromHeader(auth);   // 上一步寫好的
		return memberAuthService.getProfile(memberId);
	}
}
