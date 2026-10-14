package tw.ispan.smartorder.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "dining_session")
public class DiningSession {

    // 用餐場次 ID
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 桌位 ID
    @Column(name = "table_id")
    private Long tableId;

    // 桌位ManyToOne
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "table_id",
            insertable = false,
            updatable = false
    )
    private DiningTable diningTable;

    // 用餐狀態
    @Column(name = "status")
    private String status;

    // 入座時間
    @Column(name = "opened_at")
    private LocalDateTime openedAt;

    // 結束時間
    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    // 成人數量
    @Column(name = "adult_count")
    private Integer adultCount;

    // 兒童數量
    @Column(name = "child_count")
    private Integer childCount;

    // 商品小計
    @Column(name = "subtotal")
    private BigDecimal subtotal;

    // 服務費
    @Column(name = "service_fee")
    private BigDecimal serviceFee;

    // 總金額
    @Column(name = "total")
    private BigDecimal total;

    // 購物車版本
    @Column(name = "cart_version")
    private Integer cartVersion;

    // 購物車版本 +1
    public void increaseCartVersion() {
        if (cartVersion == null) {
            cartVersion = 0;
        }
        cartVersion++;
    }
}
