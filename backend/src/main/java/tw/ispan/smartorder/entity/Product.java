package tw.ispan.smartorder.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;

/**
 * 對應 Northwind 的 Products 資料表。
 *
 * Entity（實體）是 Java 物件與資料表之間的映射；它不是直接給前端使用的 API 格式。
 */
@Entity
@Table(name = "Products")
public class Product {

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

    protected Product() {
        // JPA 需要無參數建構子來建立 Entity。
    }

    public Product(String productName, BigDecimal unitPrice, Integer unitsInStock,
                   Boolean discontinued, Integer categoryId) {
        this.productName = productName;
        this.unitPrice = unitPrice;
        this.unitsInStock = unitsInStock;
        this.discontinued = discontinued;
        this.categoryId = categoryId;
    }

    public Integer getId() {
        return id;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
    }

    public Integer getUnitsInStock() {
        return unitsInStock;
    }

    public void setUnitsInStock(Integer unitsInStock) {
        this.unitsInStock = unitsInStock;
    }

    public Boolean getDiscontinued() {
        return discontinued;
    }

    public void setDiscontinued(Boolean discontinued) {
        this.discontinued = discontinued;
    }

    public Integer getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(Integer categoryId) {
        this.categoryId = categoryId;
    }
}
