package tw.ispan.smartorder.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "option_value")
@Getter
@Setter
public class OptionValueEntity {
    @Id
    private Long id;

   @ManyToOne
   @JoinColumn(name="option_group_id")
    private OptionGroupEntity optionGroupId;
    private String name;
    private BigDecimal priceDelta;
    private Integer sortOrder;
    private Boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
