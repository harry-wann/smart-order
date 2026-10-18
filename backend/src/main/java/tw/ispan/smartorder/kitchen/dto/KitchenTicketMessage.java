package tw.ispan.smartorder.kitchen.dto;

public record KitchenTicketMessage(
        String type,
        Object ticket
) {
}
