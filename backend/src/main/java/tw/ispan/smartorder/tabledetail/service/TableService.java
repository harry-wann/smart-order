package tw.ispan.smartorder.tabledetail.service;

import tw.ispan.smartorder.tabledetail.dto.TableDetailResponse;
import tw.ispan.smartorder.tabledetail.dto.CheckoutRequest;
import tw.ispan.smartorder.tabledetail.dto.SettleResponse;
import tw.ispan.smartorder.tabledetail.dto.CancelSessionResponse;

import tw.ispan.smartorder.entity.DiningTableEntity;
import tw.ispan.smartorder.entity.DiningSessionEntity;
import tw.ispan.smartorder.entity.OrderTicketEntity;
import tw.ispan.smartorder.entity.OrderItemEntity;
import tw.ispan.smartorder.entity.OrderItemOptionEntity;
import tw.ispan.smartorder.entity.PaymentEntity;

import tw.ispan.smartorder.repository.DiningTableRepository;
import tw.ispan.smartorder.repository.DiningSessionRepository;
import tw.ispan.smartorder.repository.OrderTicketRepository;
import tw.ispan.smartorder.repository.OrderItemRepository;
import tw.ispan.smartorder.repository.OrderItemOptionRepository;
import tw.ispan.smartorder.repository.PaymentRepository;
import tw.ispan.smartorder.service.BillingCalculator;
import tw.ispan.smartorder.service.MenuCheckoutNotifier;
import tw.ispan.smartorder.service.TableStatusNotifier;
import tw.ispan.smartorder.service.PendingPaymentGuard;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class TableService {
    @org.springframework.beans.factory.annotation.Autowired
    private PendingPaymentGuard pendingPaymentGuard;
    private final DiningTableRepository tableRepository;
    private final DiningSessionRepository sessionRepository;
    private final OrderTicketRepository ticketRepository;
    private final OrderItemRepository itemRepository;
    private final OrderItemOptionRepository optionRepository;
    private final PaymentRepository paymentRepository;
    private final BillingCalculator billingCalculator;
    private final MenuCheckoutNotifier menuCheckoutNotifier;
    private final TableStatusNotifier tableStatusNotifier;

    private static final DateTimeFormatter TIME_FORMAT =
            DateTimeFormatter.ofPattern("HH:mm");

    private static final Set<String> PAYMENT_METHODS =
            Set.of("CASH", "CARD", "BARCODE");

    public TableService(
            DiningTableRepository tableRepository,
            DiningSessionRepository sessionRepository,
            OrderTicketRepository ticketRepository,
            OrderItemRepository itemRepository,
            OrderItemOptionRepository optionRepository,
            PaymentRepository paymentRepository,
            BillingCalculator billingCalculator,
            MenuCheckoutNotifier menuCheckoutNotifier,
            TableStatusNotifier tableStatusNotifier
    ) {
        this.tableRepository = tableRepository;
        this.sessionRepository = sessionRepository;
        this.ticketRepository = ticketRepository;
        this.itemRepository = itemRepository;
        this.optionRepository = optionRepository;
        this.paymentRepository = paymentRepository;
        this.billingCalculator = billingCalculator;
        this.menuCheckoutNotifier = menuCheckoutNotifier;
        this.tableStatusNotifier = tableStatusNotifier;
    }

    @Transactional(readOnly = true)
    public TableDetailResponse getDetail(String tableNumber) {
        DiningTableEntity table = tableRepository.findByTableNo(tableNumber)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND, "找不到桌位：" + tableNumber
                        )
                );

        DiningSessionEntity session = sessionRepository
                .findFirstByTableIdAndStatusOrderByOpenedAtDesc(
                        table.getId(), "OPEN"
                ).orElse(null);

        return toDetail(table, session);
    }

    @Transactional(readOnly = true)
    public TableDetailResponse getSessionDetail(Long sessionId) {
        DiningSessionEntity session = sessionRepository.findById(sessionId)
                .orElseThrow(SettlementException::notFound);
        DiningTableEntity table = tableRepository.findById(session.getTableId())
                .orElseThrow(() -> SettlementException.conflict("TABLE_NOT_FOUND", "找不到此用餐場次的桌位"));
        return toDetail(table, session);
    }

    private TableDetailResponse toDetail(DiningTableEntity table, DiningSessionEntity session) {
        String tableInfo = table.getSeats() + "人桌";
        if (session == null) {
            return new TableDetailResponse(table.getTableNo(), tableInfo, "未用餐", "", 0,
                    0, 0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                    List.of(), null, null, false);
        }
        LocalDateTime openedAt = session.getOpenedAt();
        String seatedTime = openedAt == null ? "" : openedAt.format(TIME_FORMAT);
        long diningMinutes = openedAt == null ? 0 : Math.max(0,
                Duration.between(openedAt, LocalDateTime.now()).toMinutes());
        List<OrderTicketEntity> history = ticketRepository.findByDiningSessionIdOrderBySequenceNoDesc(session.getId());
        List<OrderTicketEntity> tickets = history.stream()
                .filter(ticket -> !"CANCELLED".equals(ticket.getStatus())).toList();
        List<TableDetailResponse.OrderDto> orders = tickets.stream().map(this::toOrderDto).toList();
        String diningStatus = switch (session.getStatus()) {
            case "PAID" -> "已結帳";
            case "CANCELLED" -> "已取消";
            default -> "用餐中";
        };
        return new TableDetailResponse(
                table.getTableNo(),
                tableInfo,
                diningStatus,
                seatedTime,
                diningMinutes,
                safeInt(session.getAdultCount()),
                safeInt(session.getChildCount()),
                safeMoney(session.getSubtotal()),
                safeMoney(session.getServiceFee()),
                safeMoney(session.getTotal()),
                orders,
                session.getId(),
                session.getStatus(),
                !history.isEmpty()
        );
    }

    // 訂單轉 DTO

    private TableDetailResponse.OrderDto toOrderDto(
            OrderTicketEntity ticket
    ) {

        List<OrderItemEntity> items = itemRepository.findByOrderTicketIdAndStatusNotOrderByIdAsc(
                ticket.getId(), "CANCELLED"
        );

        List<TableDetailResponse.OrderItemDto> itemDtos = items.stream().map(this::toOrderItemDto).toList();

        // 計算訂單金額
        BigDecimal orderTotal = items.stream()
                .map(item -> safeMoney(item.getLineTotal()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 訂單時間
        String time = ticket.getPlacedAt() == null ? "" : ticket.getPlacedAt().format(TIME_FORMAT);

        return new TableDetailResponse.OrderDto(
                ticket.getId(),
                ticket.getSequenceNo(),
                ticket.getStatus(),
                time,
                orderTotal,
                itemDtos
        );
    }


    // 餐點轉 DTO

    private TableDetailResponse.OrderItemDto toOrderItemDto(
            OrderItemEntity item
    ) {

        // 查詢餐點選項
        List<OrderItemOptionEntity> options = optionRepository
                .findByOrderItemIdOrderByIdAsc(item.getId());

        // 合併選項
        String optionsText = options.stream()
                .map(OrderItemOptionEntity::getValueNameSnapshot)
                .filter(value -> value != null && !value.isBlank())
                .collect(Collectors.joining("・"));

        // 備註
        String note = item.getNote() == null ? "" : item.getNote();

        // 合併選項與備註
        String fullNote;

        if (optionsText.isEmpty()) {
            fullNote = note;
        } else if (note.isBlank()) {
            fullNote = optionsText;
        } else {
            fullNote = optionsText + "・備註：" + note;
        }

        return new TableDetailResponse.OrderItemDto(
                item.getId(),
                item.getItemNameSnapshot(),
                safeInt(item.getQuantity()),
                fullNote,
                item.getStatus()
        );
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public SettleResponse settle(Long sessionId, CheckoutRequest request) {
        if (request == null || request.method() == null || !PAYMENT_METHODS.contains(request.method())
                || request.expectedTotal() == null || request.expectedTotal().signum() < 0) {
            throw SettlementException.validation("請提供付款方式與有效的預期金額");
        }
        DiningSessionEntity session = lockOpenSession(sessionId);
        DiningTableEntity table = lockOccupiedTable(session);

        // Same session lock as submit/cancel. The calculator flushes JPA and reads valid snapshots.
        BillingCalculator.Amount amount = billingCalculator.recalculateAndStore(session);
        if (amount.total().compareTo(request.expectedTotal()) != 0) {
            throw SettlementException.billChanged(toDetail(table, session));
        }
        PaymentEntity payment = new PaymentEntity();
        payment.setDiningSessionId(sessionId);
        payment.setMethod(request.method());
        payment.setAmount(amount.total());
        payment.setStatus("SUCCESS");
        LocalDateTime closedAt = LocalDateTime.now();
        payment.setPaidAt(closedAt);
        paymentRepository.save(payment);

        session.setStatus("PAID");
        session.setClosedAt(closedAt);
        if (menuCheckoutNotifier.completeAfterCommit(sessionId, "PAID")) session.increaseCartVersion();
        table.setStatus("CLEANING");
        tableStatusNotifier.notifyAfterCommit(table);
        return new SettleResponse(sessionId, "PAID", request.method(), amount.total(),
                table.getTableNo(), table.getStatus(), closedAt);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public CancelSessionResponse cancel(Long sessionId) {
        DiningSessionEntity session = lockOpenSession(sessionId);
        DiningTableEntity table = lockOccupiedTable(session);
        if (!ticketRepository.findByDiningSessionIdOrderBySequenceNoDesc(sessionId).isEmpty()) {
            throw SettlementException.conflict("SESSION_HAS_ORDERS", "此用餐場次已有點餐，無法取消");
        }
        billingCalculator.recalculateAndStore(session);
        LocalDateTime closedAt = LocalDateTime.now();
        session.setStatus("CANCELLED");
        session.setClosedAt(closedAt);
        if (menuCheckoutNotifier.completeAfterCommit(sessionId, "CANCELLED")) session.increaseCartVersion();
        table.setStatus("AVAILABLE");
        tableStatusNotifier.notifyAfterCommit(table);
        return new CancelSessionResponse(sessionId, "CANCELLED", table.getTableNo(),
                table.getStatus(), closedAt);
    }

    private DiningSessionEntity lockOpenSession(Long sessionId) {
        DiningSessionEntity session = sessionRepository.findWithLockById(sessionId)
                .orElseThrow(SettlementException::notFound);
        if (!"OPEN".equals(session.getStatus())) throw SettlementException.closed(session.getStatus());
        if (pendingPaymentGuard.hasOutstanding(sessionId)) {
            throw SettlementException.conflict("PAYMENT_PENDING", "此桌有尚待確認的線上付款");
        }
        return session;
    }

    private DiningTableEntity lockOccupiedTable(DiningSessionEntity session) {
        DiningTableEntity table = tableRepository.findByIdForUpdate(session.getTableId())
                .orElseThrow(() -> SettlementException.conflict("TABLE_NOT_OCCUPIED", "桌位無法結束用餐"));
        if (!"OCCUPIED".equals(table.getStatus())) {
            throw SettlementException.conflict("TABLE_NOT_OCCUPIED", "桌位目前不是用餐中");
        }
        List<Long> openSessionIds = sessionRepository.findOpenSessionIdsByTableId(table.getId());
        if (openSessionIds.size() != 1 || !session.getId().equals(openSessionIds.get(0))) {
            throw SettlementException.conflict("TABLE_SESSION_CONFLICT", "此桌有其他進行中的用餐場次");
        }
        return table;
    }

    // 金額 null 防護
    private BigDecimal safeMoney(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    // 數字 null 防護
    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }
}
