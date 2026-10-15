package tw.ispan.smartorder.ordercart.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CurrentGuestServiceImpl implements CurrentGuestService {

    // 暫時使用資料庫中存在的資料 測試 客人 ID
    private static final Long TEST_GUEST_ID = 97L;

    @Override
    public Long requireGuestId(Long sessionId) {

        if (sessionId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "找不到用餐場次"
            );
        }
        return TEST_GUEST_ID;
    }
}