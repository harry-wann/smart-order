package tw.ispan.smartorder.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tw.ispan.smartorder.dto.AdminMenuItemDto;
import tw.ispan.smartorder.dto.MenuItemOptionDetailDto;
import tw.ispan.smartorder.dto.MenuItemOptionDetailRow;
import tw.ispan.smartorder.dto.request.SaveMenuItemRequest;
import tw.ispan.smartorder.entity.MenuItemEntity;
import tw.ispan.smartorder.entity.InventoryEntity;
import tw.ispan.smartorder.repository.CartItemRepository;
import tw.ispan.smartorder.repository.InventoryRepository;
import tw.ispan.smartorder.repository.MenuCategoryRepository;
import tw.ispan.smartorder.repository.MenuItemRepository;
import tw.ispan.smartorder.repository.MenuItemOptionGroupRepository;
import tw.ispan.smartorder.repository.OrderItemRepository;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MenuItemService {
    @Autowired
    private MenuStatusNotifier menuStatusNotifier;
    @Autowired
    private MenuItemRepository menuItemRepository;

    @Autowired
    private MenuCategoryRepository menuCategoryRepository;

    @Autowired
    private InventoryRepository inventoryRepository;

    @Autowired
    private MenuItemOptionGroupRepository menuItemOptionGroupRepository;

    @Autowired
    private CartItemRepository cartItemRepository;

    @Autowired
    private OrderItemRepository orderItemRepository;

    @Transactional
    public AdminMenuItemDto createAdminMenuItem(SaveMenuItemRequest request) {
        LocalDateTime now = LocalDateTime.now();
        MenuItemEntity item = new MenuItemEntity();
        item.setCategory(menuCategoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到商品分類")));
        item.setName(request.name().trim());
        item.setDescription(request.description());
        item.setPrice(request.price());
        item.setImageUrl(request.imageUrl());
        item.setIsSoupBase(false);
        item.setTrackInventory(true);
        item.setIsRefill(false);
        item.setSuitableFor("ALL");
        item.setSpicyLevel(0);
        item.setIsVegetarian(false);
        item.setContainsBeef(false);
        item.setSoldOut(request.stock() == 0);
        item.setSortOrder("0");
        item.setActive(request.active());
        item.setCreatedAt(now);
        item.setUpdatedAt(now);
        MenuItemEntity saved = menuItemRepository.save(item);

        InventoryEntity inventory = new InventoryEntity();
        inventory.setMenuItem(saved);
        inventory.setQuantity(request.stock());
        inventory.setLowThreshold(10);
        inventory.setCreatedAt(now);
        inventory.setUpdatedAt(now);
        inventoryRepository.save(inventory);
        item.setSoldOut(request.stock() == 0);
        return toAdminMenuItemDto(saved, request.stock());
    }

    @Transactional
    public AdminMenuItemDto updateAdminMenuItem(Long id, SaveMenuItemRequest request) {
        MenuItemEntity item = menuItemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到商品"));
        item.setCategory(menuCategoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到商品分類")));
        item.setName(request.name().trim());
        item.setDescription(request.description());
        item.setPrice(request.price());
        item.setImageUrl(request.imageUrl());
        boolean wasActive = Boolean.TRUE.equals(item.getActive());
        item.setActive(request.active());
        item.setUpdatedAt(LocalDateTime.now());
        MenuItemEntity saved = menuItemRepository.save(item);

        LocalDateTime now = LocalDateTime.now();
        InventoryEntity inventory = inventoryRepository.findByMenuItem_Id(id).orElseGet(() -> {
            InventoryEntity created = new InventoryEntity();
            created.setMenuItem(saved);
            created.setLowThreshold(10);
            created.setCreatedAt(now);
            return created;
        });
        boolean wasSoldOut = inventory.getQuantity() == null || inventory.getQuantity() <= 0;
        inventory.setQuantity(request.stock());
        inventory.setUpdatedAt(now);
        inventoryRepository.save(inventory);
        saved.setSoldOut(request.stock() == 0);
        if (wasSoldOut != (request.stock() == 0)) {
            menuStatusNotifier.notifyAfterCommit(id, request.stock() == 0);
        }
        if (wasActive != request.active()) {
            menuStatusNotifier.notifyVisibilityAfterCommit(id, request.active());
        }
        return toAdminMenuItemDto(saved, request.stock());
    }

    @Transactional
    public AdminMenuItemDto updateAdminMenuItemStatus(Long id, boolean active) {
        MenuItemEntity item = menuItemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到商品"));
        boolean wasActive = Boolean.TRUE.equals(item.getActive());
        item.setActive(active);
        item.setUpdatedAt(LocalDateTime.now());
        menuItemRepository.save(item);
        if (wasActive != active) {
            menuStatusNotifier.notifyVisibilityAfterCommit(id, active);
        }
        Integer stock = inventoryRepository.findByMenuItem_Id(id)
                .map(InventoryEntity::getQuantity).orElse(0);
        return toAdminMenuItemDto(item, stock);
    }

    @Transactional
    public void deleteAdminMenuItem(Long id) {
        MenuItemEntity item = menuItemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到商品"));
        if (cartItemRepository.existsByMenuItem_Id(id) || orderItemRepository.existsByMenuItemId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "商品已出現在購物車或訂單中，無法刪除");
        }
        menuItemOptionGroupRepository.deleteByMenuItemId(id);
        inventoryRepository.deleteByMenuItem_Id(id);
        menuItemRepository.delete(item);
    }

    private AdminMenuItemDto toAdminMenuItemDto(MenuItemEntity item, Integer stock) {
        return new AdminMenuItemDto(item.getId(), item.getImageUrl(), item.getName(),
                item.getDescription(), item.getPrice(), item.getCategory().getId(),
                stock, item.getActive());
    }

    @Transactional
    public List<MenuItemEntity> findMenuItem(Long categoryId){
        List<MenuItemEntity> items;
        if (categoryId == null) {
            items = menuItemRepository.findByActiveTrue();
        } else {
            items = menuItemRepository.findByActiveTrueAndCategory_Id(categoryId);
        }
        return withCurrentSoldOutStatus(items);
    }

    public List<AdminMenuItemDto> findAdminMenuItems(Long categoryId) {
        if (categoryId == null) {
            return menuItemRepository.findAllAdminMenuItems();
        }
        return menuItemRepository.findAdminMenuItemsByCategoryId(categoryId);
    }

    public List<AdminMenuItemDto> searchAdminMenuItems(String keyword) {
        return menuItemRepository.searchAdminMenuItemsByKeyword(keyword.trim());
    }

    @Transactional
    public List<MenuItemEntity> searchMenuItem(String keyword){
        String searchKeyword = keyword == null ? "" : keyword.trim();
        if (searchKeyword.isEmpty()) {
            return withCurrentSoldOutStatus(menuItemRepository.findByActiveTrue());
        }
        return withCurrentSoldOutStatus(menuItemRepository.searchActiveMenuItemsByKeyword(searchKeyword));
    }

    private List<MenuItemEntity> withCurrentSoldOutStatus(List<MenuItemEntity> items) {
        for (MenuItemEntity item : items) {
            boolean soldOut = false;
            if (!Boolean.FALSE.equals(item.getTrackInventory())) {
                int stock = inventoryRepository.findByMenuItem_Id(item.getId())
                        .map(inventory -> inventory.getQuantity() == null ? 0 : inventory.getQuantity())
                        .orElse(0);
                soldOut = stock <= 0;
            }
            if (!Boolean.valueOf(soldOut).equals(item.getSoldOut())) {
                item.setSoldOut(soldOut);
                item.setUpdatedAt(LocalDateTime.now());
                menuItemRepository.save(item);
            }
        }
        return items;
    }

//    public Optional<MenuItemEntity> findMenuItemById(Long id) {
//        return menuItemRepository.findById(id);
//    }

    public MenuItemOptionDetailDto findOptionValuesByMenuItemId(Long menuItemId) {
        List<MenuItemOptionDetailRow> rows =
                menuItemRepository.findOptionValuesByMenuItemId(menuItemId);
        MenuItemOptionDetailRow item = rows.stream()
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到上架中的商品"));

        Map<Long, OptionGroupBuilder> groups = new LinkedHashMap<>();
        for (MenuItemOptionDetailRow row : rows) {
            if (row.getOptionGroupId() == null) {
                continue;
            }

            OptionGroupBuilder group = groups.computeIfAbsent(
                    row.getOptionGroupId(),
                    id -> new OptionGroupBuilder(
                            id,
                            row.getOptionGroupName(),
                            row.getMinSelect(),
                            row.getMaxSelect()
                    )
            );
            if (row.getOptionValueId() != null) {
                group.optionValues.putIfAbsent(
                        row.getOptionValueId(),
                        new MenuItemOptionDetailDto.OptionValueDto(
                                row.getOptionValueId(),
                                row.getOptionValueName(),
                                row.getPriceDelta()
                        )
                );
            }
        }

        List<MenuItemOptionDetailDto.OptionGroupDto> optionGroups = groups.values().stream()
                .map(OptionGroupBuilder::toDto)
                .toList();

        return new MenuItemOptionDetailDto(
                item.getMenuItemId(),
                item.getMenuItemName(),
                item.getDescription(),
                item.getImageUrl(),
                item.getPrice(),
                optionGroups
        );
    }

    private static class OptionGroupBuilder {
        private final Long id;
        private final String name;
        private final Integer minSelect;
        private final Integer maxSelect;
        private final Map<Long, MenuItemOptionDetailDto.OptionValueDto> optionValues =
                new LinkedHashMap<>();

        private OptionGroupBuilder(Long id, String name, Integer minSelect, Integer maxSelect) {
            this.id = id;
            this.name = name;
            this.minSelect = minSelect;
            this.maxSelect = maxSelect;
        }

        private MenuItemOptionDetailDto.OptionGroupDto toDto() {
            return new MenuItemOptionDetailDto.OptionGroupDto(
                    id,
                    name,
                    minSelect,
                    maxSelect,
                    List.copyOf(optionValues.values())
            );
        }
    }
}
