package tw.ispan.smartorder.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tw.ispan.smartorder.dto.MenuItemOptionDetailDto;
import tw.ispan.smartorder.entity.MenuCategoryEntity;
import tw.ispan.smartorder.entity.MenuItemEntity;
import tw.ispan.smartorder.service.MenuCategoryService;
import tw.ispan.smartorder.service.MenuItemService;

import java.util.List;

@RestController
@RequestMapping("/api/order")
public class MenuController {
    @Autowired
    private MenuCategoryService menuCategoryService;

    @Autowired
    private MenuItemService menuItemService;

    // Menu, AdminMenu 畫面 提取類別
    @GetMapping("/category")
    public ResponseEntity<List<MenuCategoryEntity>> category(){
        List<MenuCategoryEntity> category = menuCategoryService.findMenuCategory(1L);
        return ResponseEntity.ok(category);
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
}
