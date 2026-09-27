package tw.ispan.smartorder.dto;

import org.springframework.data.domain.Page;

import java.util.List;

/** GET 清單回應，讓呼叫端知道分頁資訊。 */
public record ProductPageResponse(
        List<ProductResponse> items,
        int page,
        int size,
        long totalElements
) {

    public static ProductPageResponse from(Page<ProductResponse> products) {
        return new ProductPageResponse(
                products.getContent(),
                products.getNumber(),
                products.getSize(),
                products.getTotalElements()
        );
    }
}
