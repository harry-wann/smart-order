# Swagger 自動產生 API 文件

**難度** ★☆☆☆☆　**用在哪些模組** 全員　**哪幾週** 第 1 週

## 一句話

Swagger 會**自動讀你的程式碼，產生一個可以直接點按測試的 API 說明網頁**。

## 想像一下

沒有 Swagger 的時候，前後端的對話是這樣的：

> **D**：那支菜單 API 網址是什麼？
> **B**：`/api/menu/items`
> **D**：要帶什麼參數？
> **B**：categoryId，可以不帶
> **D**：回傳長什麼樣？
> **B**：等一下我截圖給你……
> **D**：我打了沒反應
> **B**：喔對，要帶 token

**這段對話一天會發生十次。**

Swagger 的做法是：後端加一個套件，它自動掃描你所有的 Controller，產生一個網頁，上面有每支 API 的網址、參數、回傳格式，而且**可以直接在網頁上按按鈕測試**。

## 怎麼裝

`pom.xml` 加一個：

```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.x.x</version>
</dependency>
```

**就這樣。** 啟動後打開 `http://localhost:8080/swagger-ui.html`，全部 API 都在上面了。

這大概是整個專案**投報率最高的一個依賴**。

## 讓它更好讀

加幾個註解，文件會更清楚：

```java
@RestController
@RequestMapping("/api/menu")
@Tag(name = "菜單", description = "顧客端菜單瀏覽")
public class MenuController {

    @Operation(summary = "查詢品項清單",
               description = "可用 categoryId 篩選分類。售完的品項 soldOut 會是 true。")
    @GetMapping("/items")
    public List<MenuItemDto> list(
        @Parameter(description = "分類 ID，不帶則回傳全部")
        @RequestParam(required = false) Long categoryId
    ) {
        return menuService.findItems(categoryId);
    }
}
```

**不加也能用**，加了更好讀。建議至少加 `@Tag` 分組，不然幾十支 API 擠在一起很難找。

## 怎麼在上面測試

1. 打開 `http://localhost:8080/swagger-ui.html`
2. 找到你要的 API，點開
3. 按 **Try it out**
4. 填參數
5. 按 **Execute**
6. 下面就會顯示真實的回應

**要帶 token 的 API**：右上角有一個 Authorize 按鈕，貼上 token 就好（需要在設定裡宣告，A 會處理）。

## 在我們的專案裡

**Swagger 是前後端的合約。**

- 開好一支 API 的人 → 在 Swagger 上自己測一次 → 通知會用到它的人
- 要串接的人不用問任何人，打開 Swagger 就知道怎麼串
- 就算是同一個人做前後端，隔一週回來看也會忘記參數長怎樣
- PR review 時，reviewer 可以直接在 Swagger 上測

我們的規定：**一支 API 沒有出現在 Swagger 上、或參數說明不正確，就不算完成**（見 [開發流程與時程](../../spec/05-開發流程與分工.md) 的完成定義）。

## 15 分鐘動手小練習

1. 在 Hello 專案的 `pom.xml` 加上 springdoc
2. 重啟，打開 `http://localhost:8080/swagger-ui.html`
3. 找到你的 `/hello`，按 Try it out → 填 name → Execute
4. 加上 `@Tag` 和 `@Operation`，重啟看看差別
5. 順便看看 `http://localhost:8080/v3/api-docs` ——那是原始的 JSON 格式

## 你會遇到的坑

**① 正式環境也開著**
Swagger 把你所有 API 攤給全世界看。
→ 用 `springdoc.swagger-ui.enabled: false` 在正式環境關掉，或用 Spring Security 擋起來。
（**但 demo 的時候建議開著**，面試官看到會覺得專業。）

**② 被 Spring Security 擋住**
加了登入驗證後，Swagger 頁面自己也被擋了。
→ Security 設定要放行 `/swagger-ui/**` 和 `/v3/api-docs/**`。

**③ 以為加了 Swagger 就不用寫規格文件**
Swagger 告訴你「這支 API 長什麼樣」，但不會告訴你「為什麼這樣設計」「什麼時候該用」。
→ **兩個都要**：[04-API 規格](../../spec/04-API規格.md) 講設計原則，Swagger 講細節。

**④ 回傳型別寫 `Object` 或 `Map`**
Swagger 就不知道要顯示什麼了。
→ 一律回傳明確的 [DTO](17-Entity與DTO.md)。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `/swagger-ui.html` 404 | 路徑不對或套件沒生效 | 試 `/swagger-ui/index.html`，或確認依賴有加 |
| Swagger 頁面被導去登入 | 被 Security 擋了 | Security 設定放行 swagger 相關路徑 |
| API 列表是空的 | Controller 沒被掃描到 | 檢查套件位置 |
| Execute 後 401 | 沒帶 token | 用右上角 Authorize |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 自動產生的 API 說明網頁 | Swagger UI |
| API 規格的標準格式 | OpenAPI |
| Spring Boot 的實作套件 | springdoc-openapi |
| API 分組 | `@Tag` |

## 自我檢核

1. Swagger 解決了前後端之間的什麼問題？
2. 前端要串一支新 API 時，應該先去哪裡看？
3. 有了 Swagger 還需要寫 API 規格文件嗎？為什麼？
4. 為什麼回傳型別不要寫 `Map`？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [springdoc-openapi 官方文件](https://springdoc.org/) | 英文 | 入門 | 15 分 |
| [Spring Boot 零基礎入門 — Swagger 篇章](https://ithelp.ithome.com.tw/users/20151036/ironman/6130) | 繁中 | 入門 | 10 分 |

## 相關頁面

[REST API 設計](../web/10-REST-API設計.md)　[Entity 與 DTO](17-Entity與DTO.md)　[Spring Security 基礎](20-SpringSecurity.md)
