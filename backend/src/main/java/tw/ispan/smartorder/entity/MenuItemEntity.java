package tw.ispan.smartorder.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "menu_item")
@Getter
@Setter
public class MenuItemEntity {
    @Id
    private String id;
    private String categoryId;
    private String name;
    private String description;
    private String price;
    private String imageUrl;
    private String isSoupBase;
    private String trackInventory;
    private String isRefill;
    private String suitableFor;
    private String spicyLevel;
    private String isVegetarian;
    private String containsBeef;
    private String soldOut;
    private String sortOrder;
    private String active;
    private String createdAt;
    private String updatedAt;
}
