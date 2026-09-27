package tw.ispan.smartorder.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;
import tw.ispan.smartorder.dto.ProductCreateRequest;
import tw.ispan.smartorder.dto.ProductPageResponse;
import tw.ispan.smartorder.dto.ProductPatchRequest;
import tw.ispan.smartorder.dto.ProductResponse;
import tw.ispan.smartorder.dto.ProductUpdateRequest;
import tw.ispan.smartorder.service.ProductService;

import java.net.URI;

/**
 * Controller（控制器）只負責 HTTP：接收請求、呼叫 Service、回傳狀態碼與 JSON。
 */
@RestController
@RequestMapping("/api/products")
public class ProductController {

    @Autowired
    private ProductService productService;

    @GetMapping
    public ProductPageResponse findAll(
        @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.ASC) Pageable pageable) {
        return productService.findAll(pageable);
    }

    @GetMapping("/{id}")
    public ProductResponse findById(@PathVariable Integer id) {
        return productService.findById(id);
    }

    @PostMapping
    public ResponseEntity<ProductResponse> create(
        @Valid @RequestBody ProductCreateRequest request,
        UriComponentsBuilder uriBuilder) {
        ProductResponse response = productService.create(request);
        URI location = uriBuilder.path("/api/products/{id}")
            .buildAndExpand(response.id())
            .toUri();
        return ResponseEntity.created(location).body(response);
    }

    @PutMapping("/{id}")
    public ProductResponse replace(
        @PathVariable Integer id,
        @Valid @RequestBody ProductUpdateRequest request) {
        return productService.replace(id, request);
    }

    @PatchMapping("/{id}")
    public ProductResponse patch(
        @PathVariable Integer id,
        @Valid @RequestBody ProductPatchRequest request) {
        return productService.patch(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        productService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
