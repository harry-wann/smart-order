package tw.ispan.smartorder.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import tw.ispan.smartorder.dto.AdminMenuCategoryDto;
import tw.ispan.smartorder.dto.AdminMenuItemDto;
import tw.ispan.smartorder.dto.AdminOptionGroupDetailDto;
import tw.ispan.smartorder.dto.AdminOptionGroupDto;
import tw.ispan.smartorder.dto.MenuItemOptionDetailDto;
import tw.ispan.smartorder.dto.request.CreateOptionGroupRequest;
import tw.ispan.smartorder.dto.request.CreateOptionValueRequest;
import tw.ispan.smartorder.dto.request.ReorderMenuCategoriesRequest;
import tw.ispan.smartorder.dto.request.SaveMenuCategoryRequest;
import tw.ispan.smartorder.dto.request.SaveMenuItemRequest;
import tw.ispan.smartorder.dto.request.ReorderOptionValuesRequest;
import tw.ispan.smartorder.dto.request.UpdateOptionValueStatusRequest;
import tw.ispan.smartorder.dto.request.UpdateOptionGroupRequest;
import tw.ispan.smartorder.dto.request.UpdateMenuItemStatusRequest;
import tw.ispan.smartorder.dto.AdminOptionValueDto;
import tw.ispan.smartorder.entity.MenuCategoryEntity;
import tw.ispan.smartorder.entity.MenuItemEntity;
import tw.ispan.smartorder.service.MenuCategoryService;
import tw.ispan.smartorder.service.MenuItemService;
import tw.ispan.smartorder.service.OptionGroupService;
import tw.ispan.smartorder.service.ItemDetailCartService;
import tw.ispan.smartorder.ordercart.service.CurrentGuestService;

import java.util.List;

// /api/order/admin/** 是菜單管理 API，只給店長（MANAGER），規則在 SecurityConfig；
// 其他路徑（category、items、cart/items）是顧客端點餐用，維持公開
@RestController
@RequestMapping("/api/order")
public class MenuController {
    @Autowired
    private MenuCategoryService menuCategoryService;

    @Autowired
    private MenuItemService menuItemService;

    @Autowired
    private OptionGroupService optionGroupService;

    @Autowired
    private ItemDetailCartService itemDetailCartService;

    @Autowired
    private CurrentGuestService currentGuestService;

    // Menu 畫面 提取類別（只有啟用的分類，依 sort_order 排序）
    @GetMapping("/category")
    public ResponseEntity<List<MenuCategoryEntity>> category(){
        List<MenuCategoryEntity> category = menuCategoryService.findActiveMenuCategories();
        return ResponseEntity.ok(category);
    }

    // AdminMenu 畫面 提取類別與商品數量（含停用的分類，依 sort_order 排序）
    @GetMapping("/admin/categories")
    public ResponseEntity<List<AdminMenuCategoryDto>> getAdminCategories() {
        return ResponseEntity.ok(menuCategoryService.findAdminCategoriesWithItemCount());
    }

    // Menu 畫面 照觸發類別提取商品指定資訊，或依照關鍵字搜尋商品資訊
    @GetMapping("/items")
    public ResponseEntity<List<MenuItemEntity>> items(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String keyword
    ){
        List<MenuItemEntity> items = keyword == null || keyword.isBlank()
                ? menuItemService.findMenuItem(categoryId)
                : menuItemService.searchMenuItem(keyword);

        return ResponseEntity.ok(items);
    }

    // ItemDetail 畫面 依照 navigate 得到的 productId 提取商品選項資訊
    @GetMapping("/items/{productId}")
    public ResponseEntity<MenuItemOptionDetailDto> getMenuItemById(
            @PathVariable Long productId
    ) {
        MenuItemOptionDetailDto menuItem =
                menuItemService.findOptionValuesByMenuItemId(productId);
        return ResponseEntity.ok(menuItem);
    }

    // ItemDetail 畫面：新增購物車品項並一併寫入備註
    @PostMapping("/cart/items")
    public ResponseEntity<Void> addItemToCartFromItemDetail(
            @RequestBody ItemDetailCartService.AddItemRequest request
    ) {
        if (request == null || request.sessionId() == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "請提供用餐桌次"
            );
        }
        Long guestId = currentGuestService.requireGuestId(request.sessionId());
        itemDetailCartService.addItem(guestId, request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    // AdminMenu 畫面 依照 categoryId 提取商品指定資訊
    @GetMapping("/admin/menu")
    public ResponseEntity<List<AdminMenuItemDto>> getAdminMenu(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String keyword
    ) {
        List<AdminMenuItemDto> items = keyword == null || keyword.isBlank()
                ? menuItemService.findAdminMenuItems(categoryId)
                : menuItemService.searchAdminMenuItems(keyword);
        return ResponseEntity.ok(items);
    }

    // AdminMenu 畫面 新增商品
    @PostMapping("/admin/items")
    public ResponseEntity<AdminMenuItemDto> createAdminMenuItem(
            @Valid @RequestBody SaveMenuItemRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(menuItemService.createAdminMenuItem(request));
    }

    // AdminMenu 畫面 依 itemId 更新商品資料
    @PutMapping("/admin/items/{itemId}")
    public ResponseEntity<AdminMenuItemDto> updateAdminMenuItem(
            @PathVariable Long itemId,
            @Valid @RequestBody SaveMenuItemRequest request
    ) {
        return ResponseEntity.ok(menuItemService.updateAdminMenuItem(itemId, request));
    }

    // AdminMenu 畫面 依 itemId 和 Body 中的 active 值，設定商品啟用狀態
    @PatchMapping("/admin/items/{itemId}/status")
    public ResponseEntity<AdminMenuItemDto> updateAdminMenuItemStatus(
            @PathVariable Long itemId,
            @Valid @RequestBody UpdateMenuItemStatusRequest request
    ) {
        return ResponseEntity.ok(menuItemService.updateAdminMenuItemStatus(itemId, request.active()));
    }

    // AdminMenu 畫面 依 itemId 刪除商品
    @DeleteMapping("/admin/items/{itemId}")
    public ResponseEntity<Void> deleteAdminMenuItem(@PathVariable Long itemId) {
        menuItemService.deleteAdminMenuItem(itemId);
        return ResponseEntity.noContent().build();
    }

    // AdminMenu 畫面 新增商品分類（name 必填，排在最後面；active 省略代表啟用）
    @PostMapping("/admin/categories")
    public ResponseEntity<AdminMenuCategoryDto> createAdminCategory(
            @Valid @RequestBody SaveMenuCategoryRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(menuCategoryService.createMenuCategory(request));
    }

    // AdminMenu 畫面 依 categoryId 改名、停用／啟用分類、改出餐順序（name、active、cookOrder 省略都代表不變）
    @PutMapping("/admin/categories/{categoryId}")
    public ResponseEntity<AdminMenuCategoryDto> updateAdminCategory(
            @PathVariable Long categoryId,
            @Valid @RequestBody SaveMenuCategoryRequest request
    ) {
        return ResponseEntity.ok(menuCategoryService.updateMenuCategory(categoryId, request));
    }

    // AdminMenu 畫面 調整分類排序：依顯示順序傳入全部分類 id，回傳排好的分類清單
    // （帶 expectedCategoryIds 時，資料庫目前的順序跟它不同回 409 CATEGORY_LIST_CHANGED）
    @PatchMapping("/admin/categories/sort-order")
    public ResponseEntity<List<AdminMenuCategoryDto>> reorderAdminCategories(
            @Valid @RequestBody ReorderMenuCategoriesRequest request
    ) {
        return ResponseEntity.ok(menuCategoryService.reorderMenuCategories(
                request.categoryIds(), request.expectedCategoryIds()));
    }

    // AdminMenu 畫面 依 categoryId 刪除商品分類（底下還有品項回 409 CATEGORY_NOT_EMPTY）
    @DeleteMapping("/admin/categories/{categoryId}")
    public ResponseEntity<Void> deleteAdminCategory(
            @PathVariable Long categoryId
    ) {
        menuCategoryService.deleteMenuCategory(categoryId);
        return ResponseEntity.noContent().build();
    }

    // MenuOptions 畫面 提取所有選項群組資訊
    @GetMapping("/admin/optionGroups")
    public ResponseEntity<List<AdminOptionGroupDto>> getOptionGroups() {
        return ResponseEntity.ok(optionGroupService.getAllOptionGroups());
    }

    // MenuOptions 畫面 修改選項群組資訊
    @PostMapping("/admin/optionGroups")
    public ResponseEntity<AdminOptionGroupDto> createOptionGroup(
            @Valid @RequestBody CreateOptionGroupRequest request
    ) {
        AdminOptionGroupDto createdGroup = optionGroupService.createOptionGroup(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdGroup);
    }

    // MenuOptions 畫面 修改選項群組資訊
    @PutMapping("/admin/optionGroups/{optionGroupId}")
    public ResponseEntity<AdminOptionGroupDto> updateOptionGroup(
            @PathVariable Long optionGroupId,
            @Valid @RequestBody UpdateOptionGroupRequest request
    ) {
        return ResponseEntity.ok(optionGroupService.updateOptionGroup(optionGroupId, request));
    }

    // MenuOptions 畫面 刪除選項群組資訊
    @DeleteMapping("/admin/optionGroups/{optionGroupId}")
    public ResponseEntity<Void> deleteOptionGroup(@PathVariable Long optionGroupId) {
        optionGroupService.deleteOptionGroup(optionGroupId);
        return ResponseEntity.noContent().build();
    }

    // MenuOptions 畫面 依照 optionGroupId 提取選項群組詳細資訊
    @GetMapping("/admin/optionGroups/{optionGroupId}")
    public ResponseEntity<AdminOptionGroupDetailDto> getOptionGroupDetail(
            @PathVariable Long optionGroupId
    ) {
        return ResponseEntity.ok(optionGroupService.getOptionGroupDetail(optionGroupId));
    }

    // MenuOptions 畫面 新增選項值
    @PostMapping("/admin/optionGroups/{optionGroupId}/items")
    public ResponseEntity<AdminOptionValueDto> createOptionValue(
            @PathVariable Long optionGroupId,
            @Valid @RequestBody CreateOptionValueRequest request
    ) {
        AdminOptionValueDto createdValue = optionGroupService.createOptionValue(optionGroupId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdValue);
    }

    // MenuOptions 畫面 修改選項值
    @PutMapping("/admin/optionGroups/{optionGroupId}/items/{optionValueId}")
    public ResponseEntity<AdminOptionValueDto> updateOptionValue(
            @PathVariable Long optionGroupId,
            @PathVariable Long optionValueId,
            @Valid @RequestBody CreateOptionValueRequest request
    ) {
        return ResponseEntity.ok(optionGroupService.updateOptionValue(optionGroupId, optionValueId, request));
    }

    // MenuOptions 畫面 依照 optionGroupId 與 optionValueId 修改選項值排序
    @PatchMapping("/admin/optionGroups/{optionGroupId}/items/sort-order")
    public ResponseEntity<Void> reorderOptionValues(
            @PathVariable Long optionGroupId,
            @Valid @RequestBody ReorderOptionValuesRequest request
    ) {
        optionGroupService.reorderOptionValues(optionGroupId, request.optionValueIds());
        return ResponseEntity.noContent().build();
    }

    // MenuOptions 畫面 修改選項值狀態
    @PatchMapping("/admin/optionGroups/{optionGroupId}/items/{optionValueId}/status")
    public ResponseEntity<AdminOptionValueDto> updateOptionValueStatus(
            @PathVariable Long optionGroupId,
            @PathVariable Long optionValueId,
            @Valid @RequestBody UpdateOptionValueStatusRequest request
    ) {
        return ResponseEntity.ok(
                optionGroupService.updateOptionValueStatus(optionGroupId, optionValueId, request));
    }

    // MenuOptions 根據 optionGroupId 與 optionValueId 刪除選項值
    @DeleteMapping("/admin/optionGroups/{optionGroupId}/items/{optionValueId}")
    public ResponseEntity<Void> deleteOptionValue(
            @PathVariable Long optionGroupId,
            @PathVariable Long optionValueId
    ) {
        optionGroupService.deleteOptionValue(optionGroupId, optionValueId);
        return ResponseEntity.noContent().build();
    }
}
