package tw.ispan.smartorder.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tw.ispan.smartorder.common.exception.ApiException;
import tw.ispan.smartorder.dto.AdminMenuItemDto;
import tw.ispan.smartorder.dto.CustomerMenuItemDto;
import tw.ispan.smartorder.dto.MenuItemOptionDetailDto;
import tw.ispan.smartorder.dto.MenuItemOptionDetailRow;
import tw.ispan.smartorder.dto.request.SaveMenuItemRequest;
import tw.ispan.smartorder.entity.MenuItemEntity;
import tw.ispan.smartorder.entity.MenuItemOptionGroupEntity;
import tw.ispan.smartorder.entity.InventoryEntity;
import tw.ispan.smartorder.entity.embeddable.MenuOptionEntity;
import tw.ispan.smartorder.repository.CartItemRepository;
import tw.ispan.smartorder.repository.InventoryRepository;
import tw.ispan.smartorder.repository.MenuCategoryRepository;
import tw.ispan.smartorder.repository.MenuItemRepository;
import tw.ispan.smartorder.repository.MenuItemOptionGroupRepository;
import tw.ispan.smartorder.repository.OptionGroupRepository;
import tw.ispan.smartorder.repository.OrderItemRepository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

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
    private OptionGroupRepository optionGroupRepository;

    @Autowired
    private CartItemRepository cartItemRepository;

    @Autowired
    private OrderItemRepository orderItemRepository;

    @Transactional
    public AdminMenuItemDto createAdminMenuItem(SaveMenuItemRequest request) {
        LocalDateTime now = LocalDateTime.now();
        MenuItemEntity item = new MenuItemEntity();
        // 沒指定的標示欄位用預設值：不是鍋底、不是續加、追蹤庫存、無飲食標示
        item.setIsSoupBase(false);
        item.setTrackInventory(true);
        item.setIsRefill(false);
        item.setSuitableFor("ALL");
        item.setSpicyLevel(0);
        item.setIsVegetarian(false);
        item.setContainsBeef(false);
        item.setSortOrder("0");
        item.setCreatedAt(now);
        applyEditableFields(item, request);
        item.setUpdatedAt(now);
        MenuItemEntity saved = menuItemRepository.save(item);

        InventoryEntity inventory = new InventoryEntity();
        inventory.setMenuItem(saved);
        inventory.setQuantity(request.stock());
        inventory.setLowThreshold(10);
        inventory.setCreatedAt(now);
        inventory.setUpdatedAt(now);
        inventoryRepository.save(inventory);

        List<Long> optionGroupIds = syncOptionGroups(saved.getId(), request.optionGroupIds());
        return toAdminMenuItemDto(saved, request.stock(), optionGroupIds);
    }

    @Transactional
    public AdminMenuItemDto updateAdminMenuItem(Long id, SaveMenuItemRequest request) {
        MenuItemEntity item = menuItemRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("找不到商品"));
        LocalDateTime now = LocalDateTime.now();
        InventoryEntity inventory = inventoryRepository.findByMenuItem_Id(id).orElseGet(() -> {
            InventoryEntity created = new InventoryEntity();
            created.setMenuItem(item);
            created.setLowThreshold(10);
            created.setCreatedAt(now);
            return created;
        });
        // 先記下修改前的狀態，之後才知道上架／售完有沒有變，要不要推播
        boolean wasActive = Boolean.TRUE.equals(item.getActive());
        boolean wasSoldOut = isSoldOut(item.getTrackInventory(), inventory.getQuantity());

        applyEditableFields(item, request);
        item.setUpdatedAt(now);
        MenuItemEntity saved = menuItemRepository.save(item);

        inventory.setQuantity(request.stock());
        inventory.setUpdatedAt(now);
        inventoryRepository.save(inventory);

        boolean nowSoldOut = Boolean.TRUE.equals(saved.getSoldOut());
        if (wasSoldOut != nowSoldOut) {
            menuStatusNotifier.notifyAfterCommit(id, nowSoldOut);
        }
        if (wasActive != request.active()) {
            menuStatusNotifier.notifyVisibilityAfterCommit(id, request.active());
        }
        List<Long> optionGroupIds = syncOptionGroups(id, request.optionGroupIds());
        return toAdminMenuItemDto(saved, request.stock(), optionGroupIds);
    }

    @Transactional
    public AdminMenuItemDto updateAdminMenuItemStatus(Long id, boolean active) {
        MenuItemEntity item = menuItemRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("找不到商品"));
        boolean wasActive = Boolean.TRUE.equals(item.getActive());
        item.setActive(active);
        item.setUpdatedAt(LocalDateTime.now());
        menuItemRepository.save(item);
        if (wasActive != active) {
            menuStatusNotifier.notifyVisibilityAfterCommit(id, active);
        }
        Integer stock = inventoryRepository.findByMenuItem_Id(id)
                .map(InventoryEntity::getQuantity).orElse(0);
        return toAdminMenuItemDto(item, stock, currentOptionGroupIds(id));
    }

    @Transactional
    public void deleteAdminMenuItem(Long id) {
        MenuItemEntity item = menuItemRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("找不到商品"));
        if (cartItemRepository.existsByMenuItem_Id(id) || orderItemRepository.existsByMenuItemId(id)) {
            throw ApiException.conflict("MENU_ITEM_IN_USE", "商品已出現在購物車或訂單中，無法刪除，請改為下架");
        }
        menuItemOptionGroupRepository.deleteByMenuItemId(id);
        inventoryRepository.deleteByMenuItem_Id(id);
        menuItemRepository.delete(item);
    }

    // 把請求裡的欄位寫進品項（新增、修改共用）並驗證。呼叫前新增的品項要先放好預設值：
    // 請求裡省略（null）的標示欄位維持品項目前的值。
    // 規則：
    // - 免費續加（1.9）：價格一定要 0、不追蹤庫存（仍然會出單，只是不扣庫存）。請求沒指定追蹤與否時自動關掉，
    //   明確要求追蹤就拒絕；價格不是 0 也拒絕，不偷偷改價
    // - 鍋底與免費續加不能同時成立
    // - 售完旗標是算出來的：只有追蹤庫存且庫存 <= 0 才算售完，不追蹤庫存的品項永遠不是售完
    private void applyEditableFields(MenuItemEntity item, SaveMenuItemRequest request) {
        String name = request.name() == null ? "" : request.name().trim();
        if (name.isEmpty()) {
            throw ApiException.badRequest("請輸入品項名稱");
        }
        if (request.price().signum() < 0) {
            throw ApiException.badRequest("價格必須大於或等於 0");
        }
        if (request.stock() < 0) {
            throw ApiException.badRequest("庫存必須大於或等於 0");
        }

        boolean refill = request.refill() != null ? request.refill() : Boolean.TRUE.equals(item.getIsRefill());
        boolean soupBase = request.soupBase() != null ? request.soupBase() : Boolean.TRUE.equals(item.getIsSoupBase());
        boolean trackInventory = request.trackInventory() != null
                ? request.trackInventory()
                : !Boolean.FALSE.equals(item.getTrackInventory());
        if (refill) {
            if (request.price().signum() != 0) {
                throw ApiException.badRequest("免費續加品項的價格必須是 0");
            }
            if (Boolean.TRUE.equals(request.trackInventory())) {
                throw ApiException.badRequest("免費續加品項不追蹤庫存");
            }
            trackInventory = false;
        }
        if (refill && soupBase) {
            throw ApiException.badRequest("鍋底不能同時是免費續加品項");
        }
        int spicyLevel = request.spicyLevel() != null
                ? request.spicyLevel()
                : (item.getSpicyLevel() == null ? 0 : item.getSpicyLevel());
        if (spicyLevel < 0 || spicyLevel > 3) {
            throw ApiException.badRequest("辣度必須介於 0 到 3");
        }

        item.setCategory(menuCategoryRepository.findById(request.categoryId())
                .orElseThrow(() -> ApiException.notFound("找不到商品分類")));
        item.setName(name);
        item.setDescription(request.description());
        item.setPrice(request.price());
        item.setImageUrl(normalizeImageUrl(request.imageUrl()));
        item.setIsRefill(refill);
        item.setIsSoupBase(soupBase);
        item.setTrackInventory(trackInventory);
        item.setSpicyLevel(spicyLevel);
        if (request.vegetarian() != null) {
            item.setIsVegetarian(request.vegetarian());
        }
        if (request.containsBeef() != null) {
            item.setContainsBeef(request.containsBeef());
        }
        item.setSoldOut(isSoldOut(trackInventory, request.stock()));
        item.setActive(request.active());
    }

    // 不追蹤庫存的品項（例如免費續加）庫存 0 也不算售完；追蹤庫存的，庫存沒有資料或 <= 0 就是售完
    private boolean isSoldOut(Boolean trackInventory, Integer stock) {
        return !Boolean.FALSE.equals(trackInventory) && (stock == null || stock <= 0);
    }

    // 空白當作沒有圖片；有填的要是 http／https 網址，避免存進奇怪的 scheme
    private String normalizeImageUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return null;
        }
        String trimmed = imageUrl.trim();
        String lower = trimmed.toLowerCase();
        if (!lower.startsWith("http://") && !lower.startsWith("https://")) {
            throw ApiException.badRequest("圖片網址需以 http:// 或 https:// 開頭");
        }
        return trimmed;
    }

    // 品項↔選項群組（1.4）：optionGroupIds 為 null 代表不動；否則整批取代，陣列順序存進 sort_order（從 1 開始）。
    // 用「差異」的方式更新：沒在清單裡的關聯刪掉、還在的只改順序、新的才新增，
    // 不先全刪再重建，避免同一交易裡刪除又新增同一組主鍵。回傳套用後的群組 id 順序
    private List<Long> syncOptionGroups(Long menuItemId, List<Long> optionGroupIds) {
        if (optionGroupIds == null) {
            return currentOptionGroupIds(menuItemId);
        }
        if (new HashSet<>(optionGroupIds).size() != optionGroupIds.size()) {
            throw ApiException.badRequest("選項群組不可重複");
        }
        if (optionGroupRepository.findAllById(optionGroupIds).size() != optionGroupIds.size()) {
            throw ApiException.notFound("找不到選項群組");
        }

        Map<Long, MenuItemOptionGroupEntity> existing = menuItemOptionGroupRepository
                .findById_MenuItemId(menuItemId).stream()
                .collect(Collectors.toMap(relation -> relation.getId().getOptionGroupId(), relation -> relation));
        List<MenuItemOptionGroupEntity> removed = existing.entrySet().stream()
                .filter(entry -> !optionGroupIds.contains(entry.getKey()))
                .map(Map.Entry::getValue)
                .toList();
        menuItemOptionGroupRepository.deleteAll(removed);

        LocalDateTime now = LocalDateTime.now();
        List<MenuItemOptionGroupEntity> kept = new ArrayList<>();
        for (int index = 0; index < optionGroupIds.size(); index++) {
            Long optionGroupId = optionGroupIds.get(index);
            MenuItemOptionGroupEntity relation = existing.get(optionGroupId);
            if (relation == null) {
                relation = new MenuItemOptionGroupEntity();
                relation.setId(new MenuOptionEntity(menuItemId, optionGroupId));
                relation.setCreatedAt(now);
            }
            relation.setSortOrder(index + 1);
            relation.setUpdatedAt(now);
            kept.add(relation);
        }
        menuItemOptionGroupRepository.saveAll(kept);
        return List.copyOf(optionGroupIds);
    }

    private List<Long> currentOptionGroupIds(Long menuItemId) {
        return menuItemOptionGroupRepository.findByMenuItemIds(List.of(menuItemId)).stream()
                .map(relation -> relation.getId().getOptionGroupId())
                .toList();
    }

    private AdminMenuItemDto toAdminMenuItemDto(MenuItemEntity item, Integer stock, List<Long> optionGroupIds) {
        return new AdminMenuItemDto(item.getId(), item.getImageUrl(), item.getName(),
                item.getDescription(), item.getPrice(), item.getCategory().getId(),
                stock, item.getActive(),
                item.getIsSoupBase(), item.getIsRefill(), item.getTrackInventory(),
                item.getIsVegetarian(), item.getContainsBeef(), item.getSpicyLevel(),
                optionGroupIds);
    }

    // 顧客端：品項上架且所屬分類啟用才看得到；依分類 sort_order、品項 sort_order 排序
    @Transactional
    public List<CustomerMenuItemDto> findMenuItem(Long categoryId){
        List<MenuItemEntity> items;
        if (categoryId == null) {
            items = menuItemRepository.findVisibleMenuItems();
        } else {
            items = menuItemRepository.findVisibleMenuItemsByCategoryId(categoryId);
        }
        return toCustomerMenuItemDtos(withCurrentSoldOutStatus(items));
    }

    @Transactional(readOnly = true)
    public List<AdminMenuItemDto> findAdminMenuItems(Long categoryId) {
        if (categoryId == null) {
            return toAdminMenuItemDtos(menuItemRepository.findAllAdminMenuItems());
        }
        return toAdminMenuItemDtos(menuItemRepository.findAdminMenuItemsByCategoryId(categoryId));
    }

    @Transactional(readOnly = true)
    public List<AdminMenuItemDto> searchAdminMenuItems(String keyword) {
        return toAdminMenuItemDtos(menuItemRepository.searchAdminMenuItemsByKeyword(keyword.trim()));
    }

    // 後台清單：選項群組關聯一次查回來再分給各品項
    private List<AdminMenuItemDto> toAdminMenuItemDtos(List<MenuItemEntity> items) {
        if (items.isEmpty()) {
            return List.of();
        }
        Map<Long, List<Long>> optionGroupIdsByItem = new HashMap<>();
        for (MenuItemOptionGroupEntity relation : menuItemOptionGroupRepository.findByMenuItemIds(
                items.stream().map(MenuItemEntity::getId).toList())) {
            optionGroupIdsByItem
                    .computeIfAbsent(relation.getId().getMenuItemId(), key -> new ArrayList<>())
                    .add(relation.getId().getOptionGroupId());
        }
        return items.stream()
                .map(item -> toAdminMenuItemDto(
                        item,
                        item.getInventory() == null || item.getInventory().getQuantity() == null
                                ? 0 : item.getInventory().getQuantity(),
                        optionGroupIdsByItem.getOrDefault(item.getId(), List.of())))
                .toList();
    }

    @Transactional
    public List<CustomerMenuItemDto> searchMenuItem(String keyword){
        String searchKeyword = keyword == null ? "" : keyword.trim();
        if (searchKeyword.isEmpty()) {
            return toCustomerMenuItemDtos(withCurrentSoldOutStatus(menuItemRepository.findVisibleMenuItems()));
        }
        return toCustomerMenuItemDtos(
                withCurrentSoldOutStatus(menuItemRepository.searchActiveMenuItemsByKeyword(searchKeyword)));
    }

    // 顧客端列表：有沒有掛必選群組一次查回來（只讀取），再分給各品項，不要每個品項各查一次
    private List<CustomerMenuItemDto> toCustomerMenuItemDtos(List<MenuItemEntity> items) {
        if (items.isEmpty()) {
            return List.of();
        }
        Set<Long> itemIdsWithRequiredOptions = new HashSet<>(
                menuItemOptionGroupRepository.findMenuItemIdsWithRequiredOptions(
                        items.stream().map(MenuItemEntity::getId).toList()));
        return items.stream()
                .map(item -> CustomerMenuItemDto.from(item, itemIdsWithRequiredOptions.contains(item.getId())))
                .toList();
    }

    // 售完旗標以現在的庫存為準；不追蹤庫存的品項（免費續加等）庫存 0 也不是售完。
    // 庫存已經跟品項一起查回來（見 MenuItemRepository 的 LEFT JOIN FETCH mi.inventory），這裡只在記憶體裡判斷，
    // 傳進來的清單一定要是那幾支查詢的結果，不然 item.getInventory() 會一個一個另外去查
    private List<MenuItemEntity> withCurrentSoldOutStatus(List<MenuItemEntity> items) {
        for (MenuItemEntity item : items) {
            boolean soldOut = false;
            if (!Boolean.FALSE.equals(item.getTrackInventory())) {
                InventoryEntity inventory = item.getInventory();
                int stock = inventory == null || inventory.getQuantity() == null ? 0 : inventory.getQuantity();
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
                .orElseThrow(() -> ApiException.notFound("找不到上架中的商品"));

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
