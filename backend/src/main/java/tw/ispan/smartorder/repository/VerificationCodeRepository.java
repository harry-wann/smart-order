package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tw.ispan.smartorder.entity.VerificationCodeEntity;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface VerificationCodeRepository extends JpaRepository<VerificationCodeEntity, Long> {
	Optional<VerificationCodeEntity> findFirstByPhoneOrderByIdDesc(String phone);

	// ── 每手機鎖（verification_phone_lock 表）──
	// 鎖的是另一張表，但只有驗證碼會用到，所以放在這裡。上鎖都用原生 SQL：Hibernate 7 的 @Lock 會產生 MySQL 5.7 不支援的 FOR UPDATE OF。
	// 鎖到交易結束（commit 或 rollback）才放開，所以呼叫的 service 方法一定要有 @Transactional。

	// 要驗證碼：第一次來就新增這一列，已經有了就更新時間。兩種情況都會把這一列鎖住，同一支手機後來的請求在這裡排隊。
	// 不用 INSERT IGNORE 再 SELECT ... FOR UPDATE：IGNORE 遇到重複只拿共享鎖，兩個請求各拿一把共享鎖後都要升級成獨佔鎖，會互相卡住變成死結；
	// ON DUPLICATE KEY UPDATE 遇到重複直接要獨佔鎖，大家照順序排隊
	@Modifying
	@Query(nativeQuery = true, value = """
					INSERT INTO verification_phone_lock (phone, last_requested_at) VALUES (:phone, :now)
					ON DUPLICATE KEY UPDATE last_requested_at = :now
					""")
	void lockPhoneForRequest(@Param("phone") String phone, @Param("now") LocalDateTime now);

	// 驗證：只鎖已經有的那一列。查不到表示這支手機從來沒要過驗證碼，不用替它新增
	@Query(nativeQuery = true, value = "SELECT phone FROM verification_phone_lock WHERE phone = :phone FOR UPDATE")
	Optional<String> lockPhoneForVerify(@Param("phone") String phone);

	// 限流用：這支手機在 since 之後要過的驗證碼時間，舊的在前
	@Query("SELECT c.createdAt FROM VerificationCodeEntity c WHERE c.phone = :phone AND c.createdAt > :since ORDER BY c.createdAt")
	List<LocalDateTime> findRequestTimesSince(@Param("phone") String phone, @Param("since") LocalDateTime since);

	// 清理排程用：已經不能用（過期或用掉），而且超出限流視窗、不會再被拿來計數的驗證碼
	@Modifying
	@Query("""
					DELETE FROM VerificationCodeEntity c
					WHERE c.createdAt < :windowStart AND (c.expiresAt < :now OR c.usedAt IS NOT NULL)
					""")
	int deleteStale(@Param("windowStart") LocalDateTime windowStart, @Param("now") LocalDateTime now);
}
