package tw.ispan.smartorder.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "option_value")
public class OptionValueEntity {
    @Id
    private Long id;

    @ManyToOne
    @JoinColumn(name = "option_group_id")
    private OptionGroupEntity optionGroupId;
    private String name;
    @Column(name = "price_delta")
    private BigDecimal priceDelta;
    @Column(name = "sort_order")
    private Integer sortOrder;
    private Boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}