package tw.ispan.smartorder.service;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import tw.ispan.smartorder.common.exception.ApiException;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/** Reads and locks current menu rules after the caller has locked the dining session. */
@Service
public class OrderValidationService {
    private final JdbcTemplate jdbc;

    public OrderValidationService(@Qualifier("smartOrderDataSource") DataSource dataSource) {
        this.jdbc = new JdbcTemplate(dataSource);
    }

    public record MenuSnapshot(Long id, String name, BigDecimal price, boolean soupBase,
                               boolean trackInventory) {}
    public record OptionSnapshot(Long id, String groupName, String valueName, BigDecimal priceDelta) {}
    public record Selection(Long menuItemId, Integer quantity, List<Long> optionValueIds, String note) {}
    public record Line(Selection selection, MenuSnapshot menu, List<OptionSnapshot> options) {}
    private record Group(Long id, String name, int min, int max) {}
    private record Value(Long id, Long groupId, String name, BigDecimal priceDelta, boolean active) {}

    public List<Line> validate(Long sessionId, List<Selection> selections) {
        if (selections == null || selections.isEmpty()) throw ApiException.badRequest("請選擇至少一項商品");
        for (Selection selection : selections) {
            if (selection == null || selection.menuItemId() == null || selection.menuItemId() <= 0) {
                throw ApiException.badRequest("商品編號不正確");
            }
            if (selection.quantity() == null || selection.quantity() < 1 || selection.quantity() > 10) {
                throw ApiException.badRequest("商品數量必須介於 1 到 10");
            }
            // order_item.note is VARCHAR(50); reject oversized input before writing snapshots.
            if (selection.note() != null
                    && selection.note().codePointCount(0, selection.note().length()) > 50) {
                throw ApiException.badRequest("備註不可超過 50 字");
            }
            if (selection.optionValueIds() == null) throw ApiException.badRequest("商品選項格式不正確");
            Set<Long> seen = new HashSet<>();
            for (Long valueId : selection.optionValueIds()) {
                if (valueId == null || valueId <= 0) throw ApiException.badRequest("商品選項編號不正確");
                if (!seen.add(valueId)) throw ApiException.badRequest("商品選項重複");
            }
        }
        Map<Long, MenuSnapshot> menus = new HashMap<>();
        Map<Long, Map<Long, Group>> groupsByMenu = new HashMap<>();
        // Lock each resource type for the whole ticket in ID order: category, menu, relation, group, value.
        List<Long> menuIds = selections.stream().map(Selection::menuItemId).distinct().sorted().toList();

        // 分類：後台停用分類會對分類列加排他鎖（FOR UPDATE），這裡先用不鎖定的查詢看各品項屬於哪個分類，
        // 再把這些分類列依 id 由小到大加共享鎖（LOCK IN SHARE MODE）直到交易結束，
        // 所以「停用分類」和「送單」會排隊：停用先到，送單看到的是已停用；送單先到，停用等這張單做完。
        // 共享鎖之間不互相擋，同一類的多張單可以同時送；一律由小到大鎖，和後台排序（鎖全部分類）才不會互等。
        // 分類只被後台鎖，後台不會再去鎖品項或用餐場次，所以和「場次 → 品項」的順序不會形成環
        Set<Long> categoryIds = new TreeSet<>();
        for (Long menuId : menuIds) {
            jdbc.query("SELECT category_id FROM menu_item WHERE id = ?", rs -> {
                categoryIds.add(rs.getLong(1));
            }, menuId);
        }
        Map<Long, Boolean> categoryActive = new HashMap<>();
        for (Long categoryId : categoryIds) {
            jdbc.query("SELECT active FROM menu_category WHERE id = ? LOCK IN SHARE MODE", rs -> {
                categoryActive.put(categoryId, rs.getBoolean(1));
            }, categoryId);
        }

        for (Long menuId : menuIds) {
            MenuSnapshot menu = jdbc.query("""
                    SELECT id, name, price, is_soup_base, track_inventory, active, sold_out, category_id
                    FROM menu_item WHERE id = ? FOR UPDATE
                    """, rs -> {
                if (!rs.next()) return null;
                // 分類不在上面鎖住的清單（品項剛好被搬到別的分類）也一律當作無法販售，請客人重新整理菜單
                if (!rs.getBoolean("active")
                        || !Boolean.TRUE.equals(categoryActive.get(rs.getLong("category_id")))
                        || (rs.getBoolean("track_inventory") && rs.getBoolean("sold_out"))) {
                    throw ApiException.conflict("ITEM_SOLD_OUT", rs.getString("name") + " 已下架或售完");
                }
                return new MenuSnapshot(rs.getLong("id"), rs.getString("name"), rs.getBigDecimal("price"),
                        rs.getBoolean("is_soup_base"), rs.getBoolean("track_inventory"));
            }, menuId);
            if (menu == null) throw ApiException.badRequest("商品不存在");
            menus.put(menuId, menu);
        }

        // A locking read bypasses a possible REPEATABLE_READ cart snapshot and holds the
        // association rows/ranges steady. This query does not lock option_group rows.
        Map<Long, Set<Long>> groupIdsByMenu = new HashMap<>();
        Set<Long> allGroupIds = new TreeSet<>();
        for (Long menuId : menuIds) {
            Set<Long> ids = new LinkedHashSet<>();
            jdbc.query("""
                    SELECT option_group_id FROM menu_item_option_group
                    WHERE menu_item_id = ? ORDER BY option_group_id FOR UPDATE
                    """, rs -> {
                ids.add(rs.getLong(1));
            }, menuId);
            groupIdsByMenu.put(menuId, ids);
            allGroupIds.addAll(ids);
        }

        Map<Long, Group> lockedGroups = new HashMap<>();
        for (Long groupId : allGroupIds) {
            Group group = jdbc.query("""
                    SELECT id, name, min_select, max_select FROM option_group
                    WHERE id = ? FOR UPDATE
                    """, rs -> rs.next() ? new Group(rs.getLong("id"), rs.getString("name"),
                    rs.getInt("min_select"), rs.getInt("max_select")) : null, groupId);
            if (group == null) throw ApiException.badRequest("商品選項群組已失效");
            lockedGroups.put(groupId, group);
        }
        for (Long menuId : menuIds) {
            Map<Long, Group> groups = new LinkedHashMap<>();
            for (Long groupId : groupIdsByMenu.get(menuId)) {
                groups.put(groupId, lockedGroups.get(groupId));
            }
            groupsByMenu.put(menuId, groups);
        }

        Set<Long> selectedValueIds = new TreeSet<>();
        for (Selection selection : selections) selectedValueIds.addAll(selection.optionValueIds());
        Map<Long, Value> lockedValues = new HashMap<>();
        for (Long valueId : selectedValueIds) {
            Value value = jdbc.query("""
                    SELECT id, option_group_id, name, price_delta, active
                    FROM option_value WHERE id = ? FOR UPDATE
                    """, rs -> rs.next() ? new Value(rs.getLong("id"), rs.getLong("option_group_id"),
                    rs.getString("name"), rs.getBigDecimal("price_delta"), rs.getBoolean("active")) : null, valueId);
            lockedValues.put(valueId, value);
        }

        List<Line> lines = new ArrayList<>();
        for (Selection selection : selections) {
            MenuSnapshot menu = menus.get(selection.menuItemId());
            Map<Long, Group> groups = groupsByMenu.get(menu.id());
            Map<Long, Integer> countByGroup = new HashMap<>();
            List<OptionSnapshot> options = new ArrayList<>();
            for (Long valueId : selection.optionValueIds().stream().sorted().toList()) {
                Value value = lockedValues.get(valueId);
                if (value == null || !value.active() || !groups.containsKey(value.groupId())) {
                    throw ApiException.badRequest("商品選項已失效或不屬於此商品");
                }
                Group group = groups.get(value.groupId());
                countByGroup.merge(group.id(), 1, Integer::sum);
                options.add(new OptionSnapshot(value.id(), group.name(), value.name(), value.priceDelta()));
            }
            for (Group group : groups.values()) {
                int count = countByGroup.getOrDefault(group.id(), 0);
                if (count < group.min() || count > group.max()) {
                    throw ApiException.badRequest("請依規則選擇" + group.name());
                }
            }
            lines.add(new Line(selection, menu, List.copyOf(options)));
        }

        boolean thisSubmissionHasSoup = lines.stream().anyMatch(line -> line.menu().soupBase());
        if (!thisSubmissionHasSoup) {
            Integer existingSoup = jdbc.queryForObject("""
                    SELECT COUNT(*) FROM order_item oi
                    JOIN order_ticket ot ON ot.id = oi.order_ticket_id
                    JOIN menu_item mi ON mi.id = oi.menu_item_id
                    WHERE ot.dining_session_id = ? AND ot.status <> 'CANCELLED'
                      AND oi.status <> 'CANCELLED' AND mi.is_soup_base = 1
                    """, Integer.class, sessionId);
            if (existingSoup == null || existingSoup == 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "SOUP_BASE_REQUIRED", "本桌請先點一份鍋底");
            }
        }
        return lines;
    }
}
