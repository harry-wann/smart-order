package tw.ispan.smartorder.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name="dining_table")
@Getter @Setter
@NoArgsConstructor
public class DiningTable {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	private String tableNo;
    private Integer seats;

    private String area;

    private String status;

    private Boolean reservable;

    private Boolean active;
}
