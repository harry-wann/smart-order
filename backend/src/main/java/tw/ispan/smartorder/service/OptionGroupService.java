package tw.ispan.smartorder.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import tw.ispan.smartorder.dto.GetOptionByIdDto;
import tw.ispan.smartorder.entity.OptionGroupEntity;
import tw.ispan.smartorder.repository.OptionGroupRepository;

import java.util.List;

@Service
public class OptionGroupService {
    @Autowired
    private OptionGroupRepository optionGroupRepository;

    public List<GetOptionByIdDto> getAllOptionGroups() {
        return optionGroupRepository.findAll().stream()
                .map(entity -> new GetOptionByIdDto(
                        entity.getId(),
                        entity.getName()
                ))
                .toList();
    }
}
