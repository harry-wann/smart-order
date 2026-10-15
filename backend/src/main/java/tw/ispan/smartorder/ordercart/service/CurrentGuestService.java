package tw.ispan.smartorder.ordercart.service;

public interface CurrentGuestService {

    // 從已驗證用餐憑證取得客人 ID ，並確認客人屬於指定的用餐場次
    Long requireGuestId(Long sessionId);
}