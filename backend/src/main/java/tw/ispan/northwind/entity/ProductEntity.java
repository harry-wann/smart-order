package tw.ispan.northwind.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

// 原檔名 Product.java
// 原路徑 tw.ispan.smartorder.entity

/**
 * 對應 Northwind 的 Products 資料表。
 *
 * Entity（實體）是 Java 物件與資料表之間的映射；它不是直接給前端使用的 API 格式。
 */
@Entity
@Table(name = "Products")
@Getter
@Setter
@NoArgsConstructor
public class ProductEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ProductID")
    private Integer id;

    @Column(name = "ProductName", nullable = false, length = 40)
    private String productName;

    @Column(name = "UnitPrice", precision = 19, scale = 4)
    private BigDecimal unitPrice;

    @Column(name = "UnitsInStock")
    private Integer unitsInStock;

    @Column(name = "Discontinued", nullable = false)
    private Boolean discontinued = false;

    @Column(name = "CategoryID")
    private Integer categoryId;
}
