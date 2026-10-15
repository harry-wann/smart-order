package tw.ispan.smartorder.dto;

public record AdminOptionGroupDto(
        Long id,
        String name,
        Integer minSelect,
        Integer maxSelect,
        Integer sortOrder
) {}
