package tw.ispan.northwind.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tw.ispan.northwind.config.NorthwindDataSourceConfig;
import tw.ispan.northwind.dto.ProductCreateRequest;
import tw.ispan.northwind.dto.ProductPageResponse;
import tw.ispan.northwind.dto.ProductPatchRequest;
import tw.ispan.northwind.dto.ProductResponse;
import tw.ispan.northwind.dto.ProductUpdateRequest;
import tw.ispan.northwind.entity.ProductEntity;
import tw.ispan.northwind.exception.CategoryNotFoundException;
import tw.ispan.northwind.exception.ProductNotFoundException;
import tw.ispan.northwind.repository.CategoryRepository;
import tw.ispan.northwind.repository.ProductRepository;

// 原路徑 tw.ispan.smartorder.service

/**
 * Service（服務層）放業務規則與交易邊界，不讓 Controller 直接操作資料庫。
 */
@Service
@Transactional(transactionManager = NorthwindDataSourceConfig.TRANSACTION_MANAGER, readOnly = true)
public class ProductService {

    @Autowired
    private ProductRepository products;

    @Autowired
    private CategoryRepository categories;

    public ProductPageResponse findAll(Pageable pageable) {
        Page<ProductResponse> page = products.findAll(pageable).map(ProductResponse::from);
        return ProductPageResponse.from(page);
    }

    public ProductResponse findById(Integer id) {
        return ProductResponse.from(required(id));
    }

    @Transactional(NorthwindDataSourceConfig.TRANSACTION_MANAGER)
    public ProductResponse create(ProductCreateRequest request) {
        requireCategory(request.categoryId());
        ProductEntity product = new ProductEntity();
        product.setProductName(request.productName());
        product.setUnitPrice(request.unitPrice());
        product.setUnitsInStock(request.unitsInStock());
        product.setDiscontinued(request.discontinued());
        product.setCategoryId(request.categoryId());
        return ProductResponse.from(products.save(product));
    }

    @Transactional(NorthwindDataSourceConfig.TRANSACTION_MANAGER)
    public ProductResponse replace(Integer id, ProductUpdateRequest request) {
        ProductEntity product = required(id);
        requireCategory(request.categoryId());
        product.setProductName(request.productName());
        product.setUnitPrice(request.unitPrice());
        product.setUnitsInStock(request.unitsInStock());
        product.setDiscontinued(request.discontinued());
        product.setCategoryId(request.categoryId());
        return ProductResponse.from(product);
    }

    @Transactional(NorthwindDataSourceConfig.TRANSACTION_MANAGER)
    public ProductResponse patch(Integer id, ProductPatchRequest request) {
        if (request.isEmpty()) {
            throw new IllegalArgumentException("PATCH 至少要提供一個要修改的欄位");
        }

        ProductEntity product = required(id);
        if (request.productName() != null) {
            if (request.productName().isBlank()) {
                throw new IllegalArgumentException("productName 不可空白");
            }
            product.setProductName(request.productName());
        }
        if (request.unitPrice() != null) {
            product.setUnitPrice(request.unitPrice());
        }
        if (request.unitsInStock() != null) {
            product.setUnitsInStock(request.unitsInStock());
        }
        if (request.discontinued() != null) {
            product.setDiscontinued(request.discontinued());
        }
        if (request.categoryId() != null) {
            requireCategory(request.categoryId());
            product.setCategoryId(request.categoryId());
        }
        return ProductResponse.from(product);
    }

    @Transactional(NorthwindDataSourceConfig.TRANSACTION_MANAGER)
    public void delete(Integer id) {
        ProductEntity product = required(id);
        products.delete(product);
    }

    private ProductEntity required(Integer id) {
        return products.findById(id).orElseThrow(() -> new ProductNotFoundException(id));
    }

    private void requireCategory(Integer id) {
        if (!categories.existsById(id)) {
            throw new CategoryNotFoundException(id);
        }
    }
}
