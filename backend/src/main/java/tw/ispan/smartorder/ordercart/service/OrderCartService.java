package tw.ispan.smartorder.ordercart.service;

import tw.ispan.smartorder.ordercart.dto.CartResponse;
import tw.ispan.smartorder.ordercart.dto.CartResponse.CartItemResponse;

import tw.ispan.smartorder.repository.DiningSessionRepository;
import tw.ispan.smartorder.repository.CartItemRepository;
import tw.ispan.smartorder.repository.CartItemOptionRepository;

import tw.ispan.smartorder.entity.DiningSessionEntity;
import tw.ispan.smartorder.entity.CartItemEntity;
import tw.ispan.smartorder.entity.CartItemOptionEntity;
import tw.ispan.smartorder.entity.OptionValueEntity;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class OrderCartService {

    private final DiningSessionRepository diningSessionRepository;
    private final CartItemRepository cartItemRepository;
    private final CartItemOptionRepository cartItemOptionRepository;
    private final CartNotificationService cartNotificationService;

    public OrderCartService(
            DiningSessionRepository diningSessionRepository,
            CartItemRepository cartItemRepository,
            CartItemOptionRepository cartItemOptionRepository,
            CartNotificationService cartNotificationService
    ) {
        this.diningSessionRepository = diningSessionRepository;
        this.cartItemRepository = cartItemRepository;
        this.cartItemOptionRepository = cartItemOptionRepository;
        this.cartNotificationService = cartNotificationService;
    }

    // 取得整桌購物車
    @Transactional(readOnly = true)
    public CartResponse getCart(Long sessionId, Long currentGuestId) {

        // 用餐場次
        DiningSessionEntity session = diningSessionRepository
                .findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "找不到用餐場次"
                ));

        // 桌號
        String tableNumber = session.getDiningTable().getTableNo();

        // 判斷鎖定
        boolean locked = !"OPEN".equals(session.getStatus());

        // 取得購物車
        Long cartVersion = session.getCartVersion();

        List<CartItemEntity> cartItems = cartItemRepository
                .findByDiningSession_IdAndAddedByGuest_IdOrderByIdAsc(
                        sessionId, currentGuestId
                );

        List<CartItemResponse> items = new ArrayList<>();

        // 處理商品
        for (CartItemEntity cartItem : cartItems) {

            Long cartItemId = cartItem.getId();
            String name = cartItem.getMenuItem().getName();
            Integer quantity = cartItem.getQuantity();
            BigDecimal unitPrice = cartItem.getUnitPrice();
            String note = cartItem.getNote() == null ? "" : cartItem.getNote();

            // 誰加入商品
            String people = "未知客人";

            if (cartItem.getAddedByGuest() != null) {
                String displayName = cartItem
                        .getAddedByGuest()
                        .getDisplayName();

                people = displayName + " 加的";
            }
            // 查詢商品選項
            List<CartItemOptionEntity> itemOptions = cartItemOptionRepository.findByCartItem_Id(cartItemId);

            // 照選項排序
            List<OptionValueEntity> optionValues = itemOptions
                    .stream()
                    .map(CartItemOptionEntity::getOptionValue)
                    .sorted(Comparator.comparing(
                            OptionValueEntity::getSortOrder,
                            Comparator.nullsLast(
                                    Comparator.naturalOrder()
                            )
                    )).toList();

            // 整理選項名稱
            List<String> options = optionValues
                    .stream()
                    .map(OptionValueEntity::getName)
                    .toList();

            // 計算加價
            BigDecimal optionPrice = optionValues
                    .stream()
                    .map(option -> option.getPriceDelta() == null
                            ? BigDecimal.ZERO
                            : option.getPriceDelta())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // 商品單價 、 選項加價
            BigDecimal price = unitPrice.add(optionPrice);

            boolean canEdit = !locked;

            // 建立商品 DTO
            CartItemResponse item = new CartItemResponse(
                    cartItemId,
                    name,
                    price,
                    quantity,
                    people,
                    options,
                    note,
                    canEdit
            );
            items.add(item);
        }

        // 回傳完整購物車
        return new CartResponse(
                sessionId,
                tableNumber,
                locked,
                cartVersion,
                items
        );
    }

    // 修改商品數量
    @Transactional
    public void updateQuantity(
            Long sessionId, Long itemId, Long currentGuestId, int quantity
    ) {

        // 商品數量限制 1 - 10
        if (quantity < 1 || quantity > 10) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "商品數量必須介於 1 到 10"
            );
        }

        // 確認點餐並鎖定
        DiningSessionEntity session = checkSessionOpenForUpdate(sessionId);

        // 查詢目前客人加入的商品
        CartItemEntity item = cartItemRepository
                .findByIdAndDiningSession_IdAndAddedByGuest_Id(
                        itemId, sessionId, currentGuestId
                )
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.FORBIDDEN, "只能修改自己加入的商品"
                ));

        // 修改商品數量
        item.setQuantity(quantity);

        // 儲存商品
        cartItemRepository.save(item);

        // 更新購物車
        session.increaseCartVersion();

        diningSessionRepository.save(session);
        cartNotificationService.notifyGuestAfterCommit(
                sessionId, currentGuestId
        );
    }

    // 刪除購物車商品
    @Transactional
    public void deleteCartItem(
            Long sessionId, Long itemId, Long currentGuestId
    ) {

        // 確認點餐並鎖定
        DiningSessionEntity session = checkSessionOpenForUpdate(sessionId);

        // 確認商品是目前客人的
        CartItemEntity item = cartItemRepository
                .findByIdAndDiningSession_IdAndAddedByGuest_Id(
                        itemId, sessionId, currentGuestId
                )
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.FORBIDDEN, "只能刪除自己加入的商品"
                ));

        // 刪除商品選項
        cartItemOptionRepository.deleteByCartItem_Id(itemId);

        // 確保選項刪除先寫入資料庫
        cartItemOptionRepository.flush();

        // 刪除購物車商品
        cartItemRepository.delete(item);

        // 更新購物車
        session.increaseCartVersion();

        diningSessionRepository.save(session);
        cartNotificationService.notifyGuestAfterCommit(
                sessionId, currentGuestId
        );
    }

    // 確認是否仍可點餐
    private DiningSessionEntity checkSessionOpenForUpdate(Long sessionId) {

// 使用悲觀鎖查詢用餐場次，若找不到則回傳 404 錯誤
        DiningSessionEntity session = diningSessionRepository
                .findWithLockById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "找不到用餐場次"
                ));

        if (!"OPEN".equals(session.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "本桌已進入結帳流程或已結帳，無法修改"
            );
        }
        return session;
    }
}
