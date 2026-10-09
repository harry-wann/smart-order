package tw.ispan.smartorder.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import tw.ispan.smartorder.entity.MenuCategoryEntity;
import tw.ispan.smartorder.repository.MenuCategoryRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MenuCategoryService {
    @Autowired
    private final MenuCategoryRepository menuCategoryRepository;
    public List<MenuCategoryEntity> findMenuCategory(Long Id){
        return menuCategoryRepository.findAll();
    }
}
