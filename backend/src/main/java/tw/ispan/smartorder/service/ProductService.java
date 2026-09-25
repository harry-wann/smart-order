package tw.ispan.smartorder.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tw.ispan.smartorder.dto.ProductCreateRequest;
import tw.ispan.smartorder.dto.ProductPageResponse;
import tw.ispan.smartorder.dto.ProductPatchRequest;
import tw.ispan.smartorder.dto.ProductResponse;
import tw.ispan.smartorder.dto.ProductUpdateRequest;
import tw.ispan.smartorder.entity.Product;
import tw.ispan.smartorder.exception.CategoryNotFoundException;
import tw.ispan.smartorder.exception.ProductNotFoundException;
import tw.ispan.smartorder.repository.CategoryRepository;
import tw.ispan.smartorder.repository.ProductRepository;

/**
 * Service（服務層）放業務規則與交易邊界，不讓 Controller 直接操作資料庫。
 */
@Service
@Transactional(readOnly = true)
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

    @Transactional
    public ProductResponse create(ProductCreateRequest request) {
        requireCategory(request.categoryId());
        Product product = new Product(
                request.productName(),
                request.unitPrice(),
                request.unitsInStock(),
                request.discontinued(),
                request.categoryId()
        );
        return ProductResponse.from(products.save(product));
    }

    @Transactional
    public ProductResponse replace(Integer id, ProductUpdateRequest request) {
        Product product = required(id);
        requireCategory(request.categoryId());
        product.setProductName(request.productName());
        product.setUnitPrice(request.unitPrice());
        product.setUnitsInStock(request.unitsInStock());
        product.setDiscontinued(request.discontinued());
        product.setCategoryId(request.categoryId());
        return ProductResponse.from(product);
    }

    @Transactional
    public ProductResponse patch(Integer id, ProductPatchRequest request) {
        if (request.isEmpty()) {
            throw new IllegalArgumentException("PATCH 至少要提供一個要修改的欄位");
        }

        Product product = required(id);
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

    @Transactional
    public void delete(Integer id) {
        Product product = required(id);
        products.delete(product);
    }

    private Product required(Integer id) {
        return products.findById(id).orElseThrow(() -> new ProductNotFoundException(id));
    }

    private void requireCategory(Integer id) {
        if (!categories.existsById(id)) {
            throw new CategoryNotFoundException(id);
        }
    }
}
