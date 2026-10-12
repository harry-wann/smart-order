package tw.ispan.smartorder.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "dining_table")
public class DiningTable {

    @Id
    private Long id;

    private String tableNo;

    private Integer seats;

    private String area;

    private String status;

    private Boolean reservable;

    private Boolean active;

    protected DiningTable() {
    }

    public Long getId() {
        return id;
    }

    public String getTableNo() {
        return tableNo;
    }

    public Integer getSeats() {
        return seats;
    }

    public String getArea() {
        return area;
    }

    public String getStatus() {
        return status;
    }

    public Boolean getReservable() {
        return reservable;
    }

    public Boolean getActive() {
        return active;
    }
}