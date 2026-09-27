package tw.ispan.smartorder.dto;

import tw.ispan.smartorder.entity.Product;

import java.math.BigDecimal;

/** 回傳給前端的資料格式，不直接暴露 Entity。 */
public record ProductResponse(
        Integer id,
        String productName,
        BigDecimal unitPrice,
        Integer unitsInStock,
        Boolean discontinued,
        Integer categoryId
) {

    public static ProductResponse from(Product product) {
        return new ProductResponse(
                product.getId(),
                product.getProductName(),
                product.getUnitPrice(),
                product.getUnitsInStock(),
                product.getDiscontinued(),
                product.getCategoryId()
        );
    }
}
