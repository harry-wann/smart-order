package tw.ispan.smartorder.service;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import tw.ispan.smartorder.common.exception.ApiException;
import tw.ispan.smartorder.entity.CartItemEntity;
import tw.ispan.smartorder.entity.CartItemOptionEntity;
import tw.ispan.smartorder.repository.CartItemOptionRepository;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
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
    private final CartItemOptionRepository cartOptions;

    public OrderValidationService(@Qualifier("smartOrderDataSource") DataSource dataSource,
                                  CartItemOptionRepository cartOptions) {
        this.jdbc = new JdbcTemplate(dataSource);
        this.cartOptions = cartOptions;
    }

    public record MenuSnapshot(Long id, String name, BigDecimal price, boolean soupBase,
                               boolean trackInventory) {}
    public record OptionSnapshot(Long id, String groupName, String valueName, BigDecimal priceDelta) {}
    public record Line(CartItemEntity cart, MenuSnapshot menu, List<OptionSnapshot> options) {}
    private record Group(Long id, String name, int min, int max) {}
    private record Value(Long id, Long groupId, String name, BigDecimal priceDelta, boolean active) {}

    public List<Line> validate(Long sessionId, List<CartItemEntity> carts) {
        Map<Long, MenuSnapshot> menus = new HashMap<>();
        Map<Long, Map<Long, Group>> groupsByMenu = new HashMap<>();
        // Lock each resource type for the whole ticket in ID order: menu, relation, group, value.
        List<Long> menuIds = carts.stream().map(c -> c.getMenuItem().getId()).distinct().sorted().toList();
        for (Long menuId : menuIds) {
            MenuSnapshot menu = jdbc.query("""
                    SELECT id, name, price, is_soup_base, track_inventory, active, sold_out
                    FROM menu_item WHERE id = ? FOR UPDATE
                    """, rs -> {
                if (!rs.next()) return null;
                if (!rs.getBoolean("active")
                        || (rs.getBoolean("track_inventory") && rs.getBoolean("sold_out"))) {
                    throw ApiException.conflict("ITEM_SOLD_OUT", rs.getString("name") + " 已下架或售完");
                }
                return new MenuSnapshot(rs.getLong("id"), rs.getString("name"), rs.getBigDecimal("price"),
                        rs.getBoolean("is_soup_base"), rs.getBoolean("track_inventory"));
            }, menuId);
            if (menu == null) throw ApiException.conflict("ITEM_SOLD_OUT", "商品已不存在");
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

        Map<Long, List<CartItemOptionEntity>> selectedByCart = new HashMap<>();
        Set<Long> selectedValueIds = new TreeSet<>();
        for (CartItemEntity cart : carts) {
            List<CartItemOptionEntity> selected = cartOptions.findByCartItem_Id(cart.getId());
            selectedByCart.put(cart.getId(), selected);
            for (CartItemOptionEntity option : selected) selectedValueIds.add(option.getOptionValue().getId());
        }
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
        for (CartItemEntity cart : carts) {
            int quantity = cart.getQuantity() == null ? 0 : cart.getQuantity();
            if (quantity < 1 || quantity > 10) throw ApiException.badRequest("商品數量必須介於 1 到 10");
            MenuSnapshot menu = menus.get(cart.getMenuItem().getId());
            Map<Long, Group> groups = groupsByMenu.get(menu.id());
            List<CartItemOptionEntity> selected = selectedByCart.get(cart.getId());
            Set<Long> seen = new HashSet<>();
            Map<Long, Integer> countByGroup = new HashMap<>();
            List<OptionSnapshot> options = new ArrayList<>();
            for (CartItemOptionEntity selectedOption : selected.stream()
                    .sorted(Comparator.comparing(o -> o.getOptionValue().getId())).toList()) {
                Long valueId = selectedOption.getOptionValue().getId();
                if (!seen.add(valueId)) throw ApiException.badRequest("商品選項重複");
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
            lines.add(new Line(cart, menu, List.copyOf(options)));
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
