package tw.ispan.smartorder.service;

import io.jsonwebtoken.JwtException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import tw.ispan.smartorder.common.exception.ApiException;
import tw.ispan.smartorder.dto.MemberLoginResponse;
import tw.ispan.smartorder.dto.MemberProfileResponse;
import tw.ispan.smartorder.dto.UpdateProfileRequest;
import tw.ispan.smartorder.entity.MemberEntity;
import tw.ispan.smartorder.entity.VerificationCodeEntity;
import tw.ispan.smartorder.exception.MemberUnauthorizedException;
import tw.ispan.smartorder.repository.MemberRepository;
import tw.ispan.smartorder.repository.VerificationCodeRepository;
import tw.ispan.smartorder.util.JwtToken;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class MemberAuthService {

	// M8 8.3：驗證碼 5 分鐘有效、錯 3 次作廢
	private static final int MAX_ATTEMPTS = 3;
	private static final Duration CODE_TTL = Duration.ofMinutes(5);
	// M8 8.4：同一支手機 10 分鐘內最多要 3 次驗證碼
	private static final int MAX_REQUESTS = 3;
	private static final Duration REQUEST_WINDOW = Duration.ofMinutes(10);
	// M8 8.6、04 §1.4：會員 JWT 7 天（員工的 12 小時在 StaffJwtProvider，跟這裡無關）
	private static final Duration MEMBER_TOKEN_TTL = Duration.ofDays(7);

	@Autowired
	private VerificationCodeRepository codeRepo;

	@Autowired
	private MemberRepository memberRepo;

	private final SecureRandom random = new SecureRandom();

	// 限流要擋得住「同一支手機同時送出好幾個請求」（例如連按 5 下）：先數再新增的話，5 個請求可能同時數到 0 次、全部通過。
	// 所以先鎖住這支手機在 verification_phone_lock 的那一列再數；後面的請求要等前一個 commit 才拿得到鎖，
	// 那時前一個新增的驗證碼已經數得到，最多只會成功 3 個。
	// READ_COMMITTED：拿到鎖之後的查詢一定看得到前一個請求剛 commit 的資料（專案裡其他上鎖的地方也都這樣設）
	@Transactional(isolation = Isolation.READ_COMMITTED)
	public String sendCode(String phone) {
		codeRepo.lockPhoneForRequest(phone, LocalDateTime.now());
		// 拿到鎖才看時間：前面排隊等了多久都不影響這次的計數和驗證碼效期
		LocalDateTime now = LocalDateTime.now();

		List<LocalDateTime> recent = codeRepo.findRequestTimesSince(phone, now.minus(REQUEST_WINDOW));
		if (recent.size() >= MAX_REQUESTS) {
			// 10 分鐘內的次數要降到 3 次以下才能再要：等倒數第 3 次滿 10 分鐘（正常情況就是最舊的那次）
			LocalDateTime availableAt = recent.get(recent.size() - MAX_REQUESTS).plus(REQUEST_WINDOW);
			long seconds = Math.max(1, (Duration.between(now, availableAt).toMillis() + 999) / 1000);
			long minutes = (seconds + 59) / 60;
			throw ApiException.tooManyAttempts("驗證碼要求太頻繁，請 " + minutes + " 分鐘後再試", seconds);
		}

		String code = String.format("%06d", random.nextInt(1_000_000));

		VerificationCodeEntity entity = new VerificationCodeEntity();
		entity.setPhone(phone);
		entity.setCode(code);
		entity.setAttemptCount(0);
		entity.setCreatedAt(now);
		entity.setExpiresAt(now.plus(CODE_TTL));

		codeRepo.save(entity);

		System.out.println("【簡訊】" + phone + " 的驗證碼是 " + code);
		return code;
	}

	// 驗證和建立會員在同一個交易：會員建立失敗時，驗證碼也不算用掉，可以再試一次。
	// 同一支手機的驗證先鎖住同一列，同時送出的請求一個一個來：
	// 兩個同時送對的，只有第一個拿到 JWT（第二個會看到驗證碼已使用）；三個同時送錯的，錯誤次數一定會加到 3。
	// noRollbackFor：打錯要丟錯誤給前端，但「錯誤次數 +1」要留下來，不能跟著 rollback
	// （帳號停用也是 ApiException，那時驗證碼已經用掉，留著用掉的狀態沒關係）
	@Transactional(isolation = Isolation.READ_COMMITTED, noRollbackFor = ApiException.class)
	public MemberLoginResponse login(String phone, String code) {
		verifyCode(phone, code);

		Optional<MemberEntity> found = memberRepo.findByPhone(phone);
		boolean newMember = found.isEmpty();
		MemberEntity member = found.orElseGet(() -> createMember(phone));

		if (!"ACTIVE".equals(member.getStatus())) {
			throw ApiException.badRequest("此帳號已停用，請洽店家");
		}

		String token = JwtToken.createToken("member:" + member.getId(), MEMBER_TOKEN_TTL);
		return new MemberLoginResponse(token, member.getProfileCompleted(), newMember, member.getNickname());
	}

	// 只在 login 的交易裡呼叫，鎖要留到整個登入做完才放開
	private void verifyCode(String phone, String code) {
		// 這支手機沒有那一列，表示從來沒要過驗證碼
		if (codeRepo.lockPhoneForVerify(phone).isEmpty()) {
			throw ApiException.badRequest("請先取得驗證碼");
		}

		VerificationCodeEntity entity = codeRepo.findFirstByPhoneOrderByIdDesc(phone)
						.orElseThrow(() -> ApiException.badRequest("請先取得驗證碼"));

		if (entity.getUsedAt() != null) {
			throw ApiException.badRequest("驗證碼已使用，請重新取得");
		}
		if (LocalDateTime.now().isAfter(entity.getExpiresAt())) {
			throw ApiException.badRequest("驗證碼已過期，請重新取得");
		}
		if (entity.getAttemptCount() >= MAX_ATTEMPTS) {
			throw ApiException.badRequest("驗證碼已失效，請重新取得");
		}

		if (!entity.getCode().equals(code)) {
			entity.setAttemptCount(entity.getAttemptCount() + 1);
			codeRepo.save(entity);

			int left = MAX_ATTEMPTS - entity.getAttemptCount();
			if (left <= 0) {
				throw ApiException.badRequest("驗證碼已失效，請重新取得");
			}
			throw ApiException.badRequest("驗證碼錯誤，還可以再試 " + left + " 次");
		}

		entity.setUsedAt(LocalDateTime.now());
		codeRepo.save(entity);
	}

	// 驗證碼清理排程（VerificationCodeScheduler）每 10 分鐘呼叫一次，回傳刪了幾筆。
	// 只刪已經不能用（過期或用掉）、而且超出限流視窗的：10 分鐘內要過的驗證碼就算過期了，限流還要拿來數。
	// READ_COMMITTED：這個條件沒有索引可用、會掃整張表，預設的 REPEATABLE READ 會把掃過的範圍整段鎖住，
	// 擋到同時在要驗證碼的人；READ_COMMITTED 只鎖真的要刪的那幾筆
	@Transactional(isolation = Isolation.READ_COMMITTED)
	public int deleteStaleCodes() {
		LocalDateTime now = LocalDateTime.now();
		return codeRepo.deleteStale(now.minus(REQUEST_WINDOW), now);
	}

	private MemberEntity createMember(String phone) {
		MemberEntity member = new MemberEntity();
		member.setPhone(phone);
		member.setProfileCompleted(false);
		member.setStatus("ACTIVE");
		return memberRepo.save(member);
	}

	// 會員中心、改資料用：一定要登入，解不出來丟 401
	public Long memberIdFromHeader(String authHeader) {
		if (authHeader == null || !authHeader.startsWith("Bearer ")) {
			throw new MemberUnauthorizedException();
		}
		try {
			String subject = JwtToken.parseToken(authHeader.substring(7));
			if (!subject.startsWith("member:")) {
				throw new MemberUnauthorizedException();
			}
			return Long.valueOf(subject.substring(7));
		} catch (JwtException | IllegalArgumentException e) {
			throw new MemberUnauthorizedException();
		}
	}

	// ── 新增 ──
	// 訂位用：可以不登入，解不出來回 null，當作匿名訂位（MemberIdentityResolver 呼叫）
	public Long memberIdOrNull(String authHeader) {
		try {
			return memberIdFromHeader(authHeader);
		} catch (MemberUnauthorizedException e) {
			return null;
		}
	}

	public void updateProfile(Long memberId, UpdateProfileRequest request) {
		MemberEntity member = memberRepo.findById(memberId)
						.orElseThrow(MemberUnauthorizedException::new);

		member.setNickname(request.nickname());
		member.setGender(request.gender());
		member.setBirthDate(request.birthDate());
		member.setProfileCompleted(true);
		memberRepo.save(member);
	}

	public MemberProfileResponse getProfile(Long memberId) {
		MemberEntity member = memberRepo.findById(memberId)
						.orElseThrow(MemberUnauthorizedException::new);

		return new MemberProfileResponse(
						member.getPhone(),
						member.getNickname(),
						member.getGender(),
						member.getBirthDate(),
						member.getCreatedAt()
		);
	}
}