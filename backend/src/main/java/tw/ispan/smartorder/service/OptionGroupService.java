package tw.ispan.smartorder.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;
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
import tw.ispan.smartorder.dto.request.UpdateOptionValueStatusRequest;
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

    @Transactional
    public void deleteOptionGroup(Long optionGroupId) {
        OptionGroupEntity group = optionGroupRepository.findById(optionGroupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到選項群組"));
        if (!menuItemOptionGroupRepository.findAdminMenuItemsByOptionGroupId(optionGroupId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "此群組仍有關聯商品，請先解除關聯再刪除");
        }
        try {
            optionValueRepository.deleteByOptionGroupId_Id(optionGroupId);
            optionValueRepository.flush();
            optionGroupRepository.delete(group);
            optionGroupRepository.flush();
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "此群組或選項仍被使用，無法刪除", exception);
        }
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

    public AdminOptionValueDto updateOptionValue(
            Long optionGroupId, Long optionValueId, CreateOptionValueRequest request) {
        OptionValueEntity entity = optionValueRepository.findById(optionValueId)
                .filter(value -> value.getOptionGroupId().getId().equals(optionGroupId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到此群組的選項"));

        entity.setName(request.name().trim());
        entity.setPriceDelta(request.priceDelta());
        entity.setUpdatedAt(LocalDateTime.now());
        OptionValueEntity updatedValue = optionValueRepository.save(entity);
        return new AdminOptionValueDto(
                updatedValue.getId(),
                updatedValue.getName(),
                updatedValue.getPriceDelta(),
                updatedValue.getSortOrder(),
                updatedValue.getActive()
        );
    }

    public AdminOptionValueDto updateOptionValueStatus(
            Long optionGroupId, Long optionValueId, UpdateOptionValueStatusRequest request) {
        OptionValueEntity entity = optionValueRepository.findById(optionValueId)
                .filter(value -> value.getOptionGroupId().getId().equals(optionGroupId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到此群組的選項"));

        entity.setActive(request.active());
        entity.setUpdatedAt(LocalDateTime.now());
        OptionValueEntity updatedValue = optionValueRepository.save(entity);
        return new AdminOptionValueDto(
                updatedValue.getId(),
                updatedValue.getName(),
                updatedValue.getPriceDelta(),
                updatedValue.getSortOrder(),
                updatedValue.getActive()
        );
    }

    @Transactional
    public void deleteOptionValue(Long optionGroupId, Long optionValueId) {
        OptionValueEntity entity = optionValueRepository.findById(optionValueId)
                .filter(value -> value.getOptionGroupId().getId().equals(optionGroupId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到此群組的選項"));

        try {
            optionValueRepository.delete(entity);
            optionValueRepository.flush();
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "此選項仍被使用，無法刪除", exception);
        }
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
