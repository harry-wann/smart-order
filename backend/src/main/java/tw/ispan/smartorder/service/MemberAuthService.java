package tw.ispan.smartorder.service;

import io.jsonwebtoken.JwtException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import tw.ispan.smartorder.dto.MemberLoginResponse;
import tw.ispan.smartorder.dto.MemberProfileResponse;
import tw.ispan.smartorder.dto.UpdateProfileRequest;
import tw.ispan.smartorder.entity.MemberEntity;
import tw.ispan.smartorder.entity.VerificationCodeEntity;
import tw.ispan.smartorder.exception.MemberUnauthorizedException;
import tw.ispan.smartorder.exception.OtpFailedException;
import tw.ispan.smartorder.repository.MemberRepository;
import tw.ispan.smartorder.repository.VerificationCodeRepository;
import tw.ispan.smartorder.util.JwtToken;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class MemberAuthService {

	private static final int MAX_ATTEMPTS=3;

	@Autowired
	private VerificationCodeRepository codeRepo;

	@Autowired
	private MemberRepository memberRepo;

	private final SecureRandom random = new SecureRandom();

	public String  sendCode(String phone) {
		String code = String.format("%06d", random.nextInt(1_000_000));

		VerificationCodeEntity entity = new VerificationCodeEntity();
		entity.setPhone(phone);
		entity.setCode(code);
		entity.setAttemptCount(0);
		entity.setExpiresAt(LocalDateTime.now().plusMinutes(5));

		codeRepo.save(entity);

		System.out.println("【簡訊】" + phone + " 的驗證碼是 " + code);
		return code;
	}

	public void verifyCode(String phone, String code) {

		VerificationCodeEntity entity = codeRepo.findFirstByPhoneOrderByIdDesc(phone)
						.orElseThrow(() -> new OtpFailedException("請先取得驗證碼"));

		if (entity.getUsedAt() != null) {
			throw new OtpFailedException("驗證碼已使用，請重新取得");
		}
		if (LocalDateTime.now().isAfter(entity.getExpiresAt())) {
			throw new OtpFailedException("驗證碼已過期，請重新取得");
		}
		if (entity.getAttemptCount() >= MAX_ATTEMPTS) {
			throw new OtpFailedException("錯誤次數過多，請重新取得");
		}

		if (!entity.getCode().equals(code)) {
			entity.setAttemptCount(entity.getAttemptCount() + 1);
			codeRepo.save(entity);

			int left = MAX_ATTEMPTS - entity.getAttemptCount();
			if (left <= 0) {
				throw new OtpFailedException("錯誤次數過多，請重新取得");
			}
			throw new OtpFailedException("驗證碼錯誤，還可以再試 " + left + " 次");
		}

		entity.setUsedAt(LocalDateTime.now());
		codeRepo.save(entity);
	}

	public MemberLoginResponse login(String phone, String code) {
		verifyCode(phone, code);

		Optional<MemberEntity> found = memberRepo.findByPhone(phone);
		boolean newMember = found.isEmpty();
		MemberEntity member = found.orElseGet(() -> createMember(phone));

		if (!"ACTIVE".equals(member.getStatus())) {
			throw new OtpFailedException("此帳號已停用，請洽店家");
		}

		String token = JwtToken.createToken("member:" + member.getId());
		return new MemberLoginResponse(token, member.getProfileCompleted(), newMember, member.getNickname());
	}

	private MemberEntity createMember(String phone) {
		MemberEntity member = new MemberEntity();
		member.setPhone(phone);
		member.setProfileCompleted(false);
		member.setStatus("ACTIVE");
		return memberRepo.save(member);   
	}

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