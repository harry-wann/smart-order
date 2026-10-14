package tw.ispan.smartorder.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@Entity
@Table(name = "dining_table")
@NoArgsConstructor
public class DiningTable {


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