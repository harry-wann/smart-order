package tw.ispan.northwind.dto;

import tw.ispan.northwind.entity.Category;

public record CategoryResponse(
        Integer id,
        String name
) {
    public static CategoryResponse from(Category category) {
        return new CategoryResponse(category.getId(), category.getName());
    }
}
