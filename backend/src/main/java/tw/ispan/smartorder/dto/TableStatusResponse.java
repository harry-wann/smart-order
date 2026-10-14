package tw.ispan.smartorder.dto;

public record TableStatusResponse(
				String tableNo,
				boolean open,
				boolean joined,
				String sessionToken
) {
}
