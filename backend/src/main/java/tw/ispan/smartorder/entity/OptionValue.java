package tw.ispan.smartorder.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "option_value")
public class OptionValue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name")
    private String name;

    @Column(name = "price_delta")
    private BigDecimal priceDelta;

    @Column(name = "sort_order")
    private Integer sortOrder;

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public BigDecimal getPriceDelta() {
        return priceDelta;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }
}
