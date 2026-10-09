package tw.ispan.smartorder.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
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

    @GetMapping("/category")
    public ResponseEntity<List<MenuCategoryEntity>> category(){
        List<MenuCategoryEntity> category = menuCategoryService.findMenuCategory(1L);
        return ResponseEntity.ok(category);
    }

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
}
