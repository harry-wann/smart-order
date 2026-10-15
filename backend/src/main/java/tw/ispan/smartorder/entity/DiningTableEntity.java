package tw.ispan.smartorder.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "dining_table")
@Getter
@Setter
@NoArgsConstructor
public class DiningTableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "status")
    private String status;

    @Column(name = "table_no")
    private String tableNo;

    @Column(name = "seats")
    private Integer seats;

    private String area;
    private Boolean reservable;
    private Boolean active;
}
