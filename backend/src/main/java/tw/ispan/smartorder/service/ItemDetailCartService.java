package tw.ispan.smartorder.service;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tw.ispan.smartorder.config.SmartOrderDataSourceConfig;
import tw.ispan.smartorder.ordercart.service.CartNotificationService;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class ItemDetailCartService {
    private static final int MAX_QUANTITY = 10;
    private static final int MAX_NOTE_LENGTH = 50;

    private final JdbcTemplate jdbcTemplate;
    private final NamedParameterJdbcTemplate namedJdbcTemplate;
    private final CartNotificationService cartNotificationService;

    public ItemDetailCartService(
            JdbcTemplate jdbcTemplate,
            NamedParameterJdbcTemplate namedJdbcTemplate,
            CartNotificationService cartNotificationService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.namedJdbcTemplate = namedJdbcTemplate;
        this.cartNotificationService = cartNotificationService;
    }

    public record AddItemRequest(
            Long sessionId,
            Long menuItemId,
            int quantity,
            List<Long> optionValueIds,
            String note
    ) {}

    private record OptionGroup(long id, String name, int minSelect, int maxSelect) {}

    private record SelectedOption(long id, long groupId, String name) {}

    @Transactional(transactionManager = SmartOrderDataSourceConfig.TRANSACTION_MANAGER)
    public void addItem(long guestId, AddItemRequest request) {
        if (request == null || request.sessionId() == null || request.menuItemId() == null
                || request.quantity() < 1 || request.quantity() > MAX_QUANTITY) {
            throw badRequest("請提供桌次、商品，以及 1 到 10 份的數量");
        }

        long sessionId = request.sessionId();
        String note = normalizeNote(request.note());
        lockOpenSession(sessionId);
        verifyGuest(sessionId, guestId);

        var menuItem = findAvailableItem(request.menuItemId());
        List<Long> optionIds = request.optionValueIds() == null ? List.of() : request.optionValueIds();
        validateOptionIds(optionIds);
        List<OptionGroup> groups = findItemOptionGroups(request.menuItemId());
        List<SelectedOption> selectedOptions = findSelectedOptions(optionIds);
        validateOptions(groups, optionIds, selectedOptions);

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    INSERT INTO cart_item
                        (dining_session_id, menu_item_id, quantity, note, unit_price, added_by_guest_id)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, sessionId);
            statement.setLong(2, request.menuItemId());
            statement.setInt(3, request.quantity());
            statement.setString(4, note);
            statement.setBigDecimal(5, menuItem.price());
            statement.setLong(6, guestId);
            return statement;
        }, keyHolder);

        Number generatedId = keyHolder.getKey();
        if (generatedId == null) {
            throw new IllegalStateException("新增購物車品項後沒有取得品項 ID");
        }
        long cartItemId = generatedId.longValue();

        for (SelectedOption option : selectedOptions) {
            jdbcTemplate.update("""
                    INSERT INTO cart_item_option (cart_item_id, option_value_id)
                    VALUES (?, ?)
                    """, cartItemId, option.id());
        }

        jdbcTemplate.update("UPDATE dining_session SET cart_version = cart_version + 1 WHERE id = ?", sessionId);
        cartNotificationService.notifyTableAfterCommit(
                sessionId, guestId, "ITEM_ADDED", menuItem.name(), request.quantity(),
                selectedOptions.stream().map(SelectedOption::name).toList(), null, 1, null);
    }

    private record MenuItem(String name, java.math.BigDecimal price) {}

    private String normalizeNote(String rawNote) {
        if (rawNote == null) return null;
        String note = rawNote.trim();
        if (note.length() > MAX_NOTE_LENGTH) {
            throw badRequest("備註不可超過 50 字");
        }
        return note.isEmpty() ? null : note;
    }

    private void lockOpenSession(long sessionId) {
        List<String> statuses = jdbcTemplate.query(
                "SELECT status FROM dining_session WHERE id = ? FOR UPDATE",
                (resultSet, rowNum) -> resultSet.getString("status"), sessionId);
        if (statuses.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到用餐桌次");
        }
        if (!"OPEN".equals(statuses.get(0))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "桌次已關閉，無法新增購物車品項");
        }
    }

    private void verifyGuest(long sessionId, long guestId) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM dining_session_guest
                WHERE id = ? AND dining_session_id = ?
                """, Integer.class, guestId, sessionId);
        if (count == null || count == 0) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "客人不屬於此桌");
        }
    }

    private MenuItem findAvailableItem(long menuItemId) {
        // 品項上架且所屬分類也啟用才能加入購物車（停用分類等於整類暫停販售）
        List<MenuItem> items = jdbcTemplate.query("""
                SELECT mi.name, mi.price FROM menu_item mi
                JOIN menu_category mc ON mc.id = mi.category_id
                WHERE mi.id = ? AND mi.active = 1 AND mc.active = 1 AND mi.sold_out = 0
                """, (resultSet, rowNum) -> new MenuItem(
                resultSet.getString("name"), resultSet.getBigDecimal("price")), menuItemId);
        if (items.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "商品已下架或售完");
        }
        return items.get(0);
    }

    private void validateOptionIds(List<Long> optionIds) {
        if (optionIds.stream().anyMatch(id -> id == null) || new HashSet<>(optionIds).size() != optionIds.size()) {
            throw badRequest("品項規格重複或資料不正確");
        }
    }

    private List<OptionGroup> findItemOptionGroups(long menuItemId) {
        return jdbcTemplate.query("""
                SELECT og.id, og.name, og.min_select, og.max_select
                FROM menu_item_option_group mog
                JOIN option_group og ON og.id = mog.option_group_id
                WHERE mog.menu_item_id = ?
                """, (resultSet, rowNum) -> new OptionGroup(
                resultSet.getLong("id"), resultSet.getString("name"),
                resultSet.getInt("min_select"), resultSet.getInt("max_select")), menuItemId);
    }

    private List<SelectedOption> findSelectedOptions(List<Long> optionIds) {
        if (optionIds.isEmpty()) return List.of();
        var params = new MapSqlParameterSource("optionIds", optionIds);
        return namedJdbcTemplate.query("""
                SELECT id, option_group_id, name
                FROM option_value
                WHERE id IN (:optionIds) AND active = 1
                """, params, (resultSet, rowNum) -> new SelectedOption(
                resultSet.getLong("id"), resultSet.getLong("option_group_id"), resultSet.getString("name")));
    }

    private void validateOptions(List<OptionGroup> groups, List<Long> optionIds, List<SelectedOption> options) {
        if (options.size() != optionIds.size()) {
            throw badRequest("品項規格不存在或已停用");
        }
        Set<Long> allowedGroupIds = new HashSet<>();
        groups.forEach(group -> allowedGroupIds.add(group.id()));
        if (options.stream().anyMatch(option -> !allowedGroupIds.contains(option.groupId()))) {
            throw badRequest("品項規格不屬於此商品");
        }

        Map<Long, Long> selectedCounts = options.stream().collect(
                java.util.stream.Collectors.groupingBy(SelectedOption::groupId, java.util.stream.Collectors.counting()));
        for (OptionGroup group : groups) {
            long count = selectedCounts.getOrDefault(group.id(), 0L);
            if (count < group.minSelect() || count > group.maxSelect()) {
                throw badRequest("請依規則選擇「" + group.name() + "」");
            }
        }
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
