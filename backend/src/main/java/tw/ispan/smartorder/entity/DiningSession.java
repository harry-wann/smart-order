package tw.ispan.smartorder.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "dining_session")
public class DiningSession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long tableId;
    private String status;
}
