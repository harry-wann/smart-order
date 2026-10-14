package tw.ispan.smartorder.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "dining_table")
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

}
