package tw.ispan.smartorder.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import tw.ispan.smartorder.dto.MenuItemOptionDetailDto;
import tw.ispan.smartorder.dto.MenuItemOptionDetailRow;
import tw.ispan.smartorder.entity.MenuItemEntity;
import tw.ispan.smartorder.repository.MenuItemRepository;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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

//    public Optional<MenuItemEntity> findMenuItemById(Long id) {
//        return menuItemRepository.findById(id);
//    }

    public MenuItemOptionDetailDto findOptionValuesByMenuItemId(Long menuItemId) {
        List<MenuItemOptionDetailRow> rows =
                menuItemRepository.findOptionValuesByMenuItemId(menuItemId);
        MenuItemOptionDetailRow item = rows.stream()
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Menu item not found with id: " + menuItemId));

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
