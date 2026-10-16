package tw.ispan.smartorder.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tw.ispan.smartorder.dto.AdminAssociatedMenuItemDto;
import tw.ispan.smartorder.dto.AdminOptionGroupDetailDto;
import tw.ispan.smartorder.dto.AdminOptionGroupDto;
import tw.ispan.smartorder.dto.AdminOptionValueDto;
import tw.ispan.smartorder.dto.request.CreateOptionGroupRequest;
import tw.ispan.smartorder.dto.request.CreateOptionValueRequest;
import tw.ispan.smartorder.dto.request.UpdateOptionGroupRequest;
import tw.ispan.smartorder.entity.OptionGroupEntity;
import tw.ispan.smartorder.entity.OptionValueEntity;
import tw.ispan.smartorder.repository.MenuItemOptionGroupRepository;
import tw.ispan.smartorder.repository.OptionGroupRepository;
import tw.ispan.smartorder.repository.OptionValueRepository;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class OptionGroupService {
    @Autowired
    private OptionGroupRepository optionGroupRepository;

    @Autowired
    private OptionValueRepository optionValueRepository;

    @Autowired
    private MenuItemOptionGroupRepository menuItemOptionGroupRepository;

    public List<AdminOptionGroupDto> getAllOptionGroups() {
        Sort sort = Sort.by("sortOrder").ascending().and(Sort.by("id").ascending());
        return optionGroupRepository.findAll(sort)
                .stream()
                .map(this::toDto)
                .toList();
    }

    public AdminOptionGroupDto createOptionGroup(CreateOptionGroupRequest request) {
        LocalDateTime now = LocalDateTime.now();
        OptionGroupEntity entity = new OptionGroupEntity();
        entity.setName(request.name().trim());
        entity.setMinSelect(request.minSelect());
        entity.setMaxSelect(request.maxSelect());
        entity.setSortOrder(0);
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        return toDto(optionGroupRepository.save(entity));
    }

    public AdminOptionGroupDto updateOptionGroup(Long optionGroupId, UpdateOptionGroupRequest request) {
        OptionGroupEntity entity = optionGroupRepository.findById(optionGroupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Option group not found"));

        entity.setName(request.name().trim());
        entity.setMinSelect(request.minSelect());
        entity.setMaxSelect(request.maxSelect());
        entity.setSortOrder(request.sortOrder());
        entity.setUpdatedAt(LocalDateTime.now());
        return toDto(optionGroupRepository.save(entity));
    }

    public AdminOptionValueDto createOptionValue(Long optionGroupId, CreateOptionValueRequest request) {
        OptionGroupEntity group = optionGroupRepository.findById(optionGroupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Option group not found"));

        LocalDateTime now = LocalDateTime.now();
        OptionValueEntity entity = new OptionValueEntity();
        entity.setOptionGroupId(group);
        entity.setName(request.name().trim());
        entity.setPriceDelta(request.priceDelta());
        entity.setSortOrder(optionValueRepository.findMaxSortOrderByGroupId(optionGroupId) + 1);
        entity.setActive(true);
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);

        OptionValueEntity createdValue = optionValueRepository.save(entity);
        return new AdminOptionValueDto(
                createdValue.getId(),
                createdValue.getName(),
                createdValue.getPriceDelta(),
                createdValue.getSortOrder(),
                createdValue.getActive()
        );
    }

    public AdminOptionGroupDetailDto getOptionGroupDetail(Long optionGroupId) {
        if (!optionGroupRepository.existsById(optionGroupId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Option group not found");
        }
        List<AdminAssociatedMenuItemDto> associatedProducts =
                menuItemOptionGroupRepository.findAdminMenuItemsByOptionGroupId(optionGroupId);
        return new AdminOptionGroupDetailDto(
                optionValueRepository.findAdminOptionValuesByGroupId(optionGroupId),
                associatedProducts
        );
    }

    private AdminOptionGroupDto toDto(OptionGroupEntity entity) {
        return new AdminOptionGroupDto(
                entity.getId(),
                entity.getName(),
                entity.getMinSelect(),
                entity.getMaxSelect(),
                entity.getSortOrder()
        );
    }
}
