package tw.ispan.smartorder.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tw.ispan.smartorder.common.exception.ApiException;
import tw.ispan.smartorder.dto.AdminMenuCategoryDto;
import tw.ispan.smartorder.dto.request.SaveMenuCategoryRequest;
import tw.ispan.smartorder.entity.MenuCategoryEntity;
import tw.ispan.smartorder.repository.MenuCategoryRepository;
import tw.ispan.smartorder.repository.MenuItemRepository;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class MenuCategoryService {

    @Autowired
    private MenuCategoryRepository menuCategoryRepository;

    @Autowired
    private MenuItemRepository menuItemRepository;

    // 顧客端：只給啟用的分類，依 sort_order 排
    public List<MenuCategoryEntity> findActiveMenuCategories(){
        return menuCategoryRepository.findByActiveTrueOrderBySortOrderAscIdAsc();
    }

    // 後台：全部分類（含停用的），順序跟顧客端一樣
    public List<AdminMenuCategoryDto> findAdminCategoriesWithItemCount() {
        return menuCategoryRepository.findAdminCategoriesWithItemCount();
    }

    @Transactional
    public AdminMenuCategoryDto createMenuCategory(SaveMenuCategoryRequest request){
        String name = requireName(request.name());
        if (menuCategoryRepository.existsByNameIgnoreCase(name)) {
            throw duplicatedName();
        }
        LocalDateTime now = LocalDateTime.now();
        MenuCategoryEntity category = new MenuCategoryEntity();
        category.setName(name);
        // 新分類排在最後；之後用排序 API 調整
        category.setSortOrder(menuCategoryRepository.findMaxSortOrder() + 1);
        category.setActive(request.active() == null || request.active());
        category.setCreatedAt(now);
        category.setUpdatedAt(now);
        return toDto(menuCategoryRepository.save(category));
    }

    // 改名、停用／啟用。active 省略代表不變
    @Transactional
    public AdminMenuCategoryDto updateMenuCategory(Long categoryId, SaveMenuCategoryRequest request) {
        MenuCategoryEntity category = findCategory(categoryId);
        String name = requireName(request.name());
        if (menuCategoryRepository.existsByNameIgnoreCaseAndIdNot(name, categoryId)) {
            throw duplicatedName();
        }
        category.setName(name);
        if (request.active() != null) {
            category.setActive(request.active());
        }
        category.setUpdatedAt(LocalDateTime.now());
        return toDto(menuCategoryRepository.save(category));
    }

    // 照傳入順序重排全部分類。清單必須剛好是目前所有分類（含停用的），
    // 少一個或多一個代表畫面上的清單過期了（別人新增／刪除過），回 409 請前端重新整理，不猜著排
    @Transactional
    public List<AdminMenuCategoryDto> reorderMenuCategories(List<Long> categoryIds) {
        Set<Long> requestedIds = new HashSet<>(categoryIds);
        if (requestedIds.size() != categoryIds.size()) {
            throw ApiException.badRequest("分類排序資料有重複的分類");
        }
        List<MenuCategoryEntity> categories = menuCategoryRepository.findAllByOrderBySortOrderAscIdAsc();
        Set<Long> existingIds = categories.stream().map(MenuCategoryEntity::getId).collect(Collectors.toSet());
        if (!requestedIds.equals(existingIds)) {
            throw ApiException.conflict("CATEGORY_LIST_CHANGED", "分類清單已變動，請重新整理後再調整排序");
        }

        Map<Long, MenuCategoryEntity> categoriesById = categories.stream()
                .collect(Collectors.toMap(MenuCategoryEntity::getId, Function.identity()));
        LocalDateTime now = LocalDateTime.now();
        for (int index = 0; index < categoryIds.size(); index++) {
            MenuCategoryEntity category = categoriesById.get(categoryIds.get(index));
            int sortOrder = index + 1;
            if (category.getSortOrder() == null || category.getSortOrder() != sortOrder) {
                category.setSortOrder(sortOrder);
                category.setUpdatedAt(now);
            }
        }
        menuCategoryRepository.saveAllAndFlush(categories);
        return menuCategoryRepository.findAdminCategoriesWithItemCount();
    }

    // 分類底下還有品項（含下架的）不能刪：品項可能已經出現在訂單裡，
    // 而且 MenuCategoryEntity 的 cascade 會連品項一起刪。暫時不賣請改成停用
    @Transactional
    public void deleteMenuCategory(Long categoryId) {
        MenuCategoryEntity category = findCategory(categoryId);
        if (menuItemRepository.existsByCategory_Id(categoryId)) {
            throw ApiException.conflict("CATEGORY_NOT_EMPTY",
                    "分類底下還有品項，請先移走或刪除品項；暫時不賣可改為停用");
        }
        menuCategoryRepository.delete(category);
    }

    private MenuCategoryEntity findCategory(Long categoryId) {
        return menuCategoryRepository.findById(categoryId)
                .orElseThrow(() -> ApiException.notFound("找不到商品分類"));
    }

    private AdminMenuCategoryDto toDto(MenuCategoryEntity category) {
        return new AdminMenuCategoryDto(category.getId(), category.getName(),
                menuItemRepository.countByCategory_Id(category.getId()),
                category.getSortOrder(), category.getActive());
    }

    // Bean Validation 已擋掉空白；這裡取 trim 後的值，並再保險檢查一次
    private String requireName(String rawName) {
        String name = rawName == null ? "" : rawName.trim();
        if (name.isEmpty()) {
            throw ApiException.badRequest("請輸入分類名稱");
        }
        return name;
    }

    private ApiException duplicatedName() {
        return ApiException.conflict("CATEGORY_NAME_DUPLICATED", "分類名稱已存在");
    }
}
