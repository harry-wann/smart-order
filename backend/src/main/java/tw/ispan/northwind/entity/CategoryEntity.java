package tw.ispan.northwind.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// 原檔名 Category.java
// 原路徑 tw.ispan.smartorder.entity

/**
 * 對應 Northwind 的 Categories 資料表。
 *
 * 這個範例只保留 API 需要的欄位，並不代表要把資料表每個欄位都搬進來。
 */
@Entity
@Table(name = "Categories")
@Getter
@Setter
@NoArgsConstructor
public class CategoryEntity {

    @Id
    @Column(name = "CategoryID")
    private Integer id;

    @Column(name = "CategoryName", nullable = false, length = 15)
    private String name;
}
