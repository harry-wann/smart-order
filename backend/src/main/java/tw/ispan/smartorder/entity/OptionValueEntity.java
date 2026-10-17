package tw.ispan.smartorder.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "option_value")
@Getter
@Setter
@NoArgsConstructor
public class OptionValueEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
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
