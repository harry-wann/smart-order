package tw.ispan.smartorder.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import tw.ispan.smartorder.dto.MenuItemOptionDetailDto;
import tw.ispan.smartorder.entity.MenuItemEntity;
import tw.ispan.smartorder.repository.MenuItemRepository;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MenuItemService {
    @Autowired
    private MenuItemRepository menuItemRepository;

    public List<MenuItemEntity> findMenuItem(Long categoryId){
        if (categoryId == null) {
            return menuItemRepository.findAll();
        }
        return menuItemRepository.findByCategory_Id(categoryId);
    }

    public List<MenuItemEntity> searchMenuItem(String keyword){
        String searchKeyword = keyword == null ? "" : keyword.trim();
        if (searchKeyword.isEmpty()) {
            return menuItemRepository.findAll();
        }
        return menuItemRepository.findByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase(
                searchKeyword, searchKeyword
        );
    }

    public Optional<MenuItemEntity> findMenuItemById(Long id) {
        return menuItemRepository.findById(id);
    }

    public List<MenuItemOptionDetailDto> findOptionValuesByMenuItemId(Long menuItemId) {
        return menuItemRepository.findOptionValuesByMenuItemId(menuItemId);
    }
}
