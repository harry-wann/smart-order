package tw.ispan.smartorder.util;

import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.TreeMap;

public class EcpayUtil {

	public static String genCheckMacValue(Map<String, String> params, String hashKey, String hashIV) {
		Map<String, String> sorted = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
		params.forEach((k, v) -> { if (!"CheckMacValue".equals(k)) sorted.put(k, v); });

		StringBuilder sb = new StringBuilder("HashKey=").append(hashKey);
		sorted.forEach((k, v) -> sb.append('&').append(k).append('=').append(v));
		sb.append("&HashIV=").append(hashIV);

		String encoded = URLEncoder.encode(sb.toString(), StandardCharsets.UTF_8)
						.toLowerCase()
						.replace("%21", "!").replace("%28", "(").replace("%29", ")")
						.replace("%2a", "*").replace("%2d", "-").replace("%2e", ".").replace("%5f", "_");

		try {
			byte[] hash = MessageDigest.getInstance("SHA-256")
							.digest(encoded.getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(hash).toUpperCase();
		} catch (Exception e) {
			throw new RuntimeException(e);
		}
	}

	// 綠界查詢 API 回傳 a=1&b=2 格式的字串，轉成 Map 才能驗 CheckMacValue
	public static Map<String, String> parseQueryString(String body) {
		Map<String, String> result = new LinkedHashMap<>();
		if (body == null || body.isBlank()) return result;
		for (String pair : body.trim().split("&")) {
			int index = pair.indexOf('=');
			if (index <= 0) continue;
			result.put(URLDecoder.decode(pair.substring(0, index), StandardCharsets.UTF_8),
						URLDecoder.decode(pair.substring(index + 1), StandardCharsets.UTF_8));
		}
		return result;
	}

	public static boolean verify(Map<String, String> params, String hashKey, String hashIV) {
		String received = params.get("CheckMacValue");
		return received != null &&
						received.equalsIgnoreCase(genCheckMacValue(params, hashKey, hashIV));
	}
}
