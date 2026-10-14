package tw.ispan.smartorder.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "dining_session_guest")
public class DiningSessionGuest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "display_name")
    private String displayName;

    public Long getId() {
        return id;
    }

    public String getDisplayName() {
        return displayName;
    }
}
