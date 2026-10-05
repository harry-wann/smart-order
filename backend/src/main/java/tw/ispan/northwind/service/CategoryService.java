package tw.ispan.northwind.service;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tw.ispan.northwind.config.NorthwindDataSourceConfig;
import tw.ispan.northwind.dto.CategoryResponse;
import tw.ispan.northwind.repository.CategoryRepository;

@Service
@Transactional(transactionManager = NorthwindDataSourceConfig.TRANSACTION_MANAGER, readOnly = true)
public class CategoryService {

    @Autowired
    private CategoryRepository categories;

    public List<CategoryResponse> findAll() {
        return categories.findAll(Sort.by("id")).stream()
                .map(CategoryResponse::from)
                .toList();
    }
}
