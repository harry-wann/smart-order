# Spring Boot 是什麼

**難度** ★★☆☆☆　**用在哪些模組** 所有後端工作　**哪幾週** 第 1 週（L0）、第 3 週

> 本頁的 `MenuController` 是火鍋店概念範例；現有 `backend/` 先以 Northwind 商品 API 練習。實際啟動指令、`.env` 和資料庫準備見 [後端環境建置](../../spring-boot/README.md)。

## 一句話

Spring Boot 是**幫你把後端的雜事全部做好的框架**，你只要寫「這個網址要回什麼」。

## 你們已經會的：Servlet

你們學過 Servlet + Tomcat。回想一下要做一支 API 有多麻煩：

```java
public class MenuServlet extends HttpServlet {
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) {
        // 自己從網址拿參數
        String categoryId = req.getParameter("categoryId");
        // 自己開資料庫連線
        // 自己寫 SQL
        // 自己把結果組成 JSON 字串
        resp.setContentType("application/json");
        resp.getWriter().write("{...自己拼字串...}");
    }
}
```

還要寫 `web.xml` 設定、要裝 Tomcat、要打包成 war 丟進去。

## Spring Boot 的同一件事

```java
@RestController
@RequestMapping("/api/menu")
public class MenuController {

    private final MenuService menuService;

    public MenuController(MenuService menuService) {
        this.menuService = menuService;
    }

    @GetMapping("/items")
    public List<MenuItemDto> list(@RequestParam(required = false) Long categoryId) {
        return menuService.findItems(categoryId);
    }
}
```

**就這樣。** 沒有 `web.xml`、不用裝 Tomcat（內建）、不用自己拼 JSON（自動轉）、不用自己開資料庫連線。

## 它幫你做了什麼

| 雜事 | Servlet 時代 | Spring Boot |
|---|---|---|
| 伺服器 | 自己裝 Tomcat、部署 war | **內建**，直接跑 main 方法 |
| 設定檔 | `web.xml` 一大堆 | `application.yml` 或 `application.properties`，多數有預設值 |
| 網址對應 | `web.xml` 裡宣告 | `@GetMapping("/items")` 貼在方法上 |
| 拿參數 | `req.getParameter()` 手動轉型 | `@RequestParam Long categoryId` 自動轉 |
| 回 JSON | 自己拼字串 | 回傳物件，自動轉 |
| 資料庫連線 | 自己開自己關 | 自動管理連線池 |
| 物件怎麼來的 | `new` 一堆 | [依賴注入](15-依賴注入.md) 自動給你 |

**一句話**：Spring Boot 把「每個專案都要做一遍的雜事」預設幫你做好了，這叫「**約定優於設定**」。

## 三個你會天天看到的標籤

```java
@RestController   // 這個類別負責接 API 請求
@Service          // 這個類別放商業邏輯
@Repository       // 這個類別負責存取資料庫
```

貼上這些標籤，Spring 啟動時會自動掃描到它們、自動建立物件、自動串在一起。你不用 `new`。

（為什麼不用 `new`？看 [依賴注入](15-依賴注入.md)。）

## 一個專案的入口

```java
@SpringBootApplication
public class SmartOrderApplication {
    public static void main(String[] args) {
        SpringApplication.run(SmartOrderApplication.class, args);
    }
}
```

**跑這個 main 方法，你的後端就起來了。** 預設在 `http://localhost:8080`。

## 設定檔放哪裡

目前專案使用 `backend/src/main/resources/application.properties`，再透過 `backend/.env` 提供每台電腦自己的資料庫帳密。下面是**未來火鍋店正式功能的 YAML 示意**，不是現有專案中可以直接編輯的檔案：

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/smart_order?useUnicode=true&characterEncoding=utf8
    username: ${SPRING_DATASOURCE_USERNAME}
    password: ${SPRING_DATASOURCE_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate      # 不要讓 JPA 自動改表，交給 Flyway
    show-sql: true            # 開發時把 SQL 印出來看

server:
  port: 8080

smartorder:                   # 我們自己的設定
  service-fee-rate: 0.10
  polling-interval-seconds: 3
```

不含機密的共用設定可放在設定檔；密碼等每台電腦不同的值放在 `.env`，不要寫成 `root/root` 或提交到 Git。現有 Northwind 練習設定是 `ddl-auto=none`、Flyway 暫停；未來正式表格才依團隊資料庫規格安排 migration。

## 15 分鐘動手小練習

1. 用 [Spring Initializr](https://start.spring.io/) 產一個只有 Spring Web 的專案
2. 開一個 `HelloController`：

```java
@RestController
public class HelloController {
    @GetMapping("/hello")
    public String hello() {
        return "火鍋店你好";
    }
}
```

3. 跑 main 方法
4. 瀏覽器打開 `http://localhost:8080/hello`

**看到那五個字的瞬間，你就寫完你人生第一支 Spring Boot API 了。** 跟 Servlet 比一下，感受一下差多少。

## 你會遇到的坑

**① 8080 被佔用**
→ 檢查現有 `application.properties` 的 `server.port`，或關閉已佔用的服務。

**② Controller 沒被掃描到**
Spring 只會掃描「主程式所在套件」和它底下的。
→ 現有 `SmartOrderApplication.java` 位於 `tw.ispan.smartorder`，Controller、Service 等放在其子套件。

**③ `ddl-auto: update` 把資料表改壞**
JPA 會自己去改資料庫結構，很危險。
→ 現有 Northwind 練習用 `none` 保護既有表格；正式功能的表結構再依 [Flyway](../database/29-Flyway.md) 規劃。

**④ 改了程式沒重啟**
Java 不像 JS 會自動重載。
→ 加 `spring-boot-devtools` 可以自動重啟。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `Web server failed to start. Port 8080 was already in use` | 埠號被佔 | 改 port，或關掉舊的 |
| `Field xxx required a bean of type ... that could not be found` | Spring 找不到要注入的東西 | 類別上忘記貼 `@Service` 之類的標籤 |
| `Failed to configure a DataSource` | 資料庫設定沒寫或連不上 | 檢查 `backend/.env`、`application.properties`，確認 Docker 的 MySQL 有開 |
| `Whitelabel Error Page` + 404 | 這個網址沒對應的 Controller | 網址打錯，或 Controller 沒被掃到 |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 幫你做好雜事的框架 | Spring Boot |
| 套餐式的相依套件 | starter |
| 約定優於設定 | convention over configuration |
| Spring 幫你管理的物件 | Bean |
| 設定檔 | `application.yml` / `application.properties` |

## 自我檢核

1. Spring Boot 比 Servlet 幫你省掉哪些事？（至少講三個）
2. `@RestController`、`@Service`、`@Repository` 各是什麼意思？
3. 設定值應該寫在哪裡？
4. 為什麼 `ddl-auto` 不能用 `update`？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [Spring Boot 零基礎入門（iThome 鐵人賽 · 古古）](https://ithelp.ithome.com.tw/users/20151036/ironman/6130) | **繁中** | **入門** | 每篇 10 分 |
| [[Day 1] Spring Boot 是什麼](https://ithelp.ithome.com.tw/articles/10213097) | 繁中 | 入門 | 10 分 |
| [Spring 官方 Guides](https://spring.io/guides) | 英文 | 中階 | 查用 |

> **要碰後端的人強烈建議把「Spring Boot 零基礎入門」系列的前 15 篇看完**，大約兩個半小時，會省下你們後面很多很多時間。
> 我們是以功能切分工作的，所以**每個人都會碰到後端**。

## 相關頁面

[依賴注入](15-依賴注入.md)　[三層架構](16-三層架構.md)　[Maven 與相依套件](13-Maven.md)　[課程 04：Spring Boot](../../spring-boot/tutorial/unit-04-spring-boot.html)
