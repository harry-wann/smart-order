package tw.ispan.smartorder.tabledetail.service;

import tw.ispan.smartorder.tabledetail.dto.TableDetailResponse;

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

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class TableService {

    private final DiningTableRepository tableRepository;
    private final DiningSessionRepository sessionRepository;
    private final OrderTicketRepository ticketRepository;
    private final OrderItemRepository itemRepository;
    private final OrderItemOptionRepository optionRepository;
    private final PaymentRepository paymentRepository;

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
            PaymentRepository paymentRepository
    ) {
        this.tableRepository = tableRepository;
        this.sessionRepository = sessionRepository;
        this.ticketRepository = ticketRepository;
        this.itemRepository = itemRepository;
        this.optionRepository = optionRepository;
        this.paymentRepository = paymentRepository;
    }

    // 查詢桌位詳細資料

    @Transactional(readOnly = true)
    public TableDetailResponse getDetail(String tableNumber) {

        // 查詢桌位
        DiningTableEntity table = tableRepository.findByTableNo(tableNumber)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND, "找不到桌位：" + tableNumber
                        )
                );

        // 查詢目前用餐紀錄
        DiningSessionEntity session = sessionRepository
                .findFirstByTableIdAndStatusOrderByOpenedAtDesc(
                        table.getId(), "OPEN"
                ).orElse(null);

        // 桌位
        String tableInfo = table.getSeats() + "人桌";

        // 沒用餐紀錄
        if (session == null) {
            return new TableDetailResponse(
                    table.getTableNo(),
                    tableInfo,
                    "未用餐",
                    "",
                    0,
                    0,
                    0,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    List.of()
            );
        }

        // 入座時間
        LocalDateTime openedAt = session.getOpenedAt();

        String seatedTime = openedAt == null ? "" : openedAt.format(TIME_FORMAT);

        // 用餐分鐘數
        long diningMinutes = openedAt == null ? 0 : Math.max(0,
                Duration.between(
                        openedAt, LocalDateTime.now()
                ).toMinutes()
        );

        // 查詢訂單
        List<OrderTicketEntity> tickets = ticketRepository
                .findByDiningSessionIdAndStatusNotOrderBySequenceNoDesc(
                        session.getId(), "CANCELLED"
                );

        // 訂單 Entity 轉 DTO
        List<TableDetailResponse.OrderDto> orders = tickets.stream().map(this::toOrderDto).toList();

        // 回傳桌位資料
        return new TableDetailResponse(
                table.getTableNo(),
                tableInfo,
                "用餐中",
                seatedTime,
                diningMinutes,
                safeInt(session.getAdultCount()),
                safeInt(session.getChildCount()),
                safeMoney(session.getSubtotal()),
                safeMoney(session.getServiceFee()),
                safeMoney(session.getTotal()),
                orders
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

    // 結帳
    @Transactional
    public void checkout(
            String tableNumber,
            String paymentMethod
    ) {

        // 驗證付款方式
        if (paymentMethod == null || paymentMethod.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "請選擇付款方式"
            );
        }

        String method = paymentMethod.trim().toUpperCase(Locale.ROOT);

        //  credit 對到資料庫 CARD
        if ("CREDIT".equals(method)) {
            method = "CARD";
        }

        if (!PAYMENT_METHODS.contains(method)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "不支援的付款方式"
            );
        }

        // 鎖定桌位
        DiningTableEntity table = tableRepository
                .findWithLockByTableNo(tableNumber)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "找不到桌位：" + tableNumber
                        )
                );

        // 鎖定目前 用餐紀錄
        List<DiningSessionEntity> sessions = sessionRepository
                .findByTableIdAndStatus(
                        table.getId(),
                        "OPEN"
                );

        if (sessions.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "此桌目前沒有可結帳的用餐紀錄"
            );
        }

        if (sessions.size() != 1) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "此桌存在多筆未結帳用餐紀錄"
            );
        }

        DiningSessionEntity session = sessions.get(0);

        // 取得結帳金額
        BigDecimal amount = safeMoney(session.getTotal());

        if (amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "結帳金額異常"
            );
        }

        // 新增付款紀錄
        PaymentEntity payment = new PaymentEntity(
                session.getId(),
                method,
                amount
        );

        paymentRepository.save(payment);

        // 更新用餐狀態
        session.setStatus("PAID");
        session.setClosedAt(LocalDateTime.now());

        sessionRepository.save(session);

        // 更新桌位狀態
        table.setStatus("CLEANING");

        tableRepository.save(table);
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
