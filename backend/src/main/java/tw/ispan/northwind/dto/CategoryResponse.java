package tw.ispan.northwind.dto;

import tw.ispan.northwind.entity.CategoryEntity;

public record CategoryResponse(
        Integer id,
        String name
) {
    public static CategoryResponse from(CategoryEntity category) {
        return new CategoryResponse(category.getId(), category.getName());
    }
}
