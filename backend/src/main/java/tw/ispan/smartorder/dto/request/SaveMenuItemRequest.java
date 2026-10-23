package tw.ispan.smartorder.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

// 新增、修改品項共用（修改是整筆覆蓋）。
// soupBase=鍋底、refill=免費續加（價格要 0、不追蹤庫存）、vegetarian=素食、containsBeef=含牛、spicyLevel=辣度 0–3。
// 下面這幾個旗標欄位可以省略：新增時用預設值（不是鍋底、不是續加、追蹤庫存、無飲食標示、辣度 0），
// 修改時省略代表維持原值，舊的呼叫端不會不小心把標示洗掉。
// optionGroupIds 同理：省略代表不動；傳空陣列代表全部移除；有傳就整批取代，陣列順序就是顧客端顯示順序
public record SaveMenuItemRequest(
        @NotBlank(message = "請輸入品項名稱")
        @Size(max = 100, message = "品項名稱最多 100 個字元")
        String name,

        @Size(max = 255, message = "商品說明最多 255 個字元")
        String description,

        @NotNull(message = "請選擇商品分類")
        Long categoryId,

        @NotNull(message = "請輸入價格")
        @DecimalMin(value = "0.00", message = "價格必須大於或等於 0")
        @Digits(integer = 8, fraction = 2, message = "價格最多 8 位整數與 2 位小數")
        BigDecimal price,

        @Size(max = 500, message = "圖片網址最多 500 個字元")
        String imageUrl,

        @NotNull(message = "請輸入庫存")
        @Min(value = 0, message = "庫存必須大於或等於 0")
        Integer stock,

        @NotNull(message = "請指定上架狀態")
        Boolean active,

        Boolean soupBase,

        Boolean refill,

        Boolean trackInventory,

        Boolean vegetarian,

        Boolean containsBeef,

        @Min(value = 0, message = "辣度必須介於 0 到 3")
        @Max(value = 3, message = "辣度必須介於 0 到 3")
        Integer spicyLevel,

        @Size(max = 20, message = "最多掛 20 個選項群組")
        List<@NotNull(message = "選項群組 ID 不可為空") Long> optionGroupIds
) {}
