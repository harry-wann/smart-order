package tw.ispan.smartorder.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

// 同桌 guest 權杖（X-Guest-Token）：join 建立 guest 時用 SecureRandom 產生 32 bytes 亂數，
// 原始值只回給加入的那支手機；資料庫只存 SHA-256 雜湊（dining_session_guest.guest_token_hash），
// 就算資料表外流，也拿不到可以直接拿來用的權杖。
// X-Device-Id 是前端自己產生的、可以偽造，不能拿來代替這個權杖找 guest。
public final class GuestToken {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int TOKEN_BYTES = 32;

    private GuestToken() {
    }

    // base64url、不補 =，43 個字元，放在 header 裡不用再編碼
    public static String generate() {
        byte[] bytes = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    // 64 個小寫十六進位字元，對應資料表的 CHAR(64)
    public static String hash(String guestToken) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(guestToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("這個 JVM 不支援 SHA-256", e);
        }
    }
}
