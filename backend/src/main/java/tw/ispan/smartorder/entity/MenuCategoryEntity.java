package tw.ispan.smartorder.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table( name = "menu_category")
@Getter
@Setter
public class MenuCategoryEntity {
    @Id
    private Long id;
    private String name;
    private String sortOrder;
    private String active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

}
