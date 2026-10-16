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
import tw.ispan.smartorder.dto.request.UpdateOptionGroupRequest;
import tw.ispan.smartorder.dto.AdminOptionValueDto;
import tw.ispan.smartorder.entity.MenuCategoryEntity;
import tw.ispan.smartorder.entity.MenuItemEntity;
import tw.ispan.smartorder.service.MenuCategoryService;
import tw.ispan.smartorder.service.MenuItemService;
import tw.ispan.smartorder.service.OptionGroupService;

import java.util.List;

@RestController
@RequestMapping("/api/order")
public class MenuController {
    @Autowired
    private MenuCategoryService menuCategoryService;

    @Autowired
    private MenuItemService menuItemService;

    @Autowired
    private OptionGroupService optionGroupService;

    // Menu 畫面 提取類別
    @GetMapping("/category")
    public ResponseEntity<List<MenuCategoryEntity>> category(){
        List<MenuCategoryEntity> category = menuCategoryService.findMenuCategory(1L);
        return ResponseEntity.ok(category);
    }

    // AdminMenu 畫面 提取類別與商品數量
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

    @PostMapping("/admin/categories")
    public ResponseEntity<MenuCategoryEntity> createAdminCategory(
            @RequestBody MenuCategoryEntity category
    ) {
        MenuCategoryEntity createdCategory = menuCategoryService.createMenuCategory(category);
        return ResponseEntity.ok(createdCategory);
    }

    @DeleteMapping("/admin/categories/{categoryId}")
    public ResponseEntity<MenuCategoryEntity> deleteAdminCategory(
            @PathVariable Long categoryId
    ) {
        MenuCategoryEntity deletedCategory = menuCategoryService.deleteMenuCategory(categoryId);
        return ResponseEntity.ok(deletedCategory);
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
}
