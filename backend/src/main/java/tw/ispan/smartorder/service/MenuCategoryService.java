package tw.ispan.smartorder.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import tw.ispan.smartorder.dto.AdminMenuCategoryDto;
import tw.ispan.smartorder.entity.MenuCategoryEntity;
import tw.ispan.smartorder.repository.MenuCategoryRepository;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MenuCategoryService {
    @Autowired
    private final MenuCategoryRepository menuCategoryRepository;
    public List<MenuCategoryEntity> findMenuCategory(Long Id){
        return menuCategoryRepository.findAll();
    }

    public List<AdminMenuCategoryDto> findAdminCategoriesWithItemCount() {
        return menuCategoryRepository.findAdminCategoriesWithItemCount();
    }

    public MenuCategoryEntity createMenuCategory(MenuCategoryEntity category){
        LocalDateTime now = LocalDateTime.now();
        category.setSortOrder(0);
        category.setActive(true);
        category.setCreatedAt(now);
        category.setUpdatedAt(now);
        return menuCategoryRepository.save(category);
    }

    public MenuCategoryEntity deleteMenuCategory(Long categoryId) {
        MenuCategoryEntity category = menuCategoryRepository.findById(categoryId).orElse(null);
        if (category != null) {
            menuCategoryRepository.delete(category);
            return category;
        } else {
            throw new RuntimeException("Menu category not found with id:" + categoryId);
        }
    }
}
