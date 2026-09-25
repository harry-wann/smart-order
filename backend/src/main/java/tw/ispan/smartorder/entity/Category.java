package tw.ispan.smartorder.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * 對應 Northwind 的 Categories 資料表。
 *
 * 這個範例只保留 API 需要的欄位，並不代表要把資料表每個欄位都搬進來。
 */
@Entity
@Table(name = "Categories")
public class Category {

    @Id
    @Column(name = "CategoryID")
    private Integer id;

    @Column(name = "CategoryName", nullable = false, length = 15)
    private String name;

    protected Category() {
        // JPA 需要無參數建構子來建立 Entity。
    }

    public Integer getId() {
        return id;
    }

    public String getName() {
        return name;
    }
}
