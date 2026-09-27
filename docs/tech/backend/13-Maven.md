# Maven 與相依套件

**難度** ★★☆☆☆　**用在哪些模組** 所有後端工作　**哪幾週** 第 1 週（L0）、第 3 週

> 本頁用火鍋店功能解釋 Maven；目前 `backend/pom.xml` 使用 Spring Boot 4.1.1，Web 依賴名稱是 `spring-boot-starter-webmvc`。[單元 02](../../spring-boot/tutorial/unit-02-maven.html) 會帶你對照現有 POM。

## 一句話

Maven 是**幫你自動下載別人寫好的程式庫**，順便幫你把專案編譯打包。

## 想像一下

你要做一道菜，需要醬油、糖、米酒。你不會自己釀醬油，你去超市買。

寫程式也一樣。你需要「連資料庫的功能」「產生 JWT 的功能」「處理 JSON 的功能」——這些都有人寫好了，你不用自己寫。

**Maven 就是幫你跑腿的那個人。** 你寫一張清單說「我要這些」，它自動去網路上（Maven 中央倉庫）抓回來，而且會連帶把那些東西自己需要的東西一起抓。

## 那張清單叫 pom.xml

```xml
<dependencies>
    <!-- 我要「做網站 API」的功能 -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-webmvc</artifactId>
    </dependency>

    <!-- 我要「連資料庫」的功能 -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>

    <!-- 我要 MySQL 的驅動程式 -->
    <dependency>
        <groupId>com.mysql</groupId>
        <artifactId>mysql-connector-j</artifactId>
        <scope>runtime</scope>
    </dependency>
</dependencies>
```

每個 `<dependency>` 就是購物清單上的一項。

## 什麼是 starter

Spring Boot 有個貼心設計叫 **starter**：它是一個「套餐」。

在目前 Boot 4 專案中加入 `spring-boot-starter-webmvc`，就會帶入 Spring MVC 與 Web API 所需的相依套件；其他必要套件由 Maven 依賴關係一併下載。Boot 3 教材常見的名稱是 `spring-boot-starter-web`，讀範例時先看自己的 `pom.xml`。

**所以 pom.xml 只列出直接使用的套件，Maven 仍可能下載許多間接依賴。**

## 我們會用到的 starter

| starter | 給你什麼 |
|---|---|
| `spring-boot-starter-webmvc` | 做 REST API（目前 Boot 4 專案） |
| `spring-boot-starter-data-jpa` | 用 [JPA](../database/25-ORM與JPA.md) 存取資料庫 |
| `spring-boot-starter-security` | [登入與權限](20-SpringSecurity.md) |
| `spring-boot-starter-validation` | 欄位驗證（`@NotNull` 那些） |
| `spring-boot-starter-websocket` | [即時推播](../realtime/41-WebSocket與STOMP.md) |
| `spring-boot-starter-data-redis` | [Redis](../realtime/44-Redis.md) |
| `spring-boot-starter-webmvc-test` 等測試 starter | 寫[測試](../quality/47-單元測試.md)；以現有 POM 為準 |
| `flyway-core` + `flyway-mysql` | [資料庫版本控管](../database/29-Flyway.md) |
| `springdoc-openapi-starter-webmvc-ui` | [Swagger 文件](19-Swagger.md) |
| `lombok` | 少寫一堆重複的程式碼 |

## 你只需要會這幾個指令

```bash
./mvnw clean            # 清掉之前編譯的東西
./mvnw compile          # 編譯
./mvnw test             # 跑測試
./mvnw package          # 打包成一個 jar 檔
./mvnw spring-boot:run  # 直接啟動
```

注意是 `./mvnw` 不是 `mvn`——那個 `w` 是 wrapper，它會自動用專案指定的 Maven 版本，**這樣五個人就不用各自裝 Maven**。（Windows 用 `mvnw.cmd`）

也可以在 VS Code 的 Spring Boot Dashboard 啟動；初學時先在終端機執行一次，比較容易看到錯誤訊息。

## 在我們的專案裡

**`pom.xml` 要有唯一負責人。** 其他人要加套件，在群組說一聲請他加。

理由：`pom.xml` 是最容易衝突的檔案之一，而且加錯版本會讓整個專案跑不起來。工作分配定案時要指定這個人。

## 15 分鐘動手小練習

1. 開啟現有 `backend/pom.xml`，找到 parent 中的 Spring Boot 版本與 `<java.version>`。
2. 在 `<dependencies>` 內找出 Web MVC、Data JPA、Validation 和 MySQL Driver，說出各自的用途。
3. 在 `backend/` 執行 `./mvnw -version`（Windows 用 `./mvnw.cmd -version`），確認 Wrapper 使用的 Java 是 21。
4. 若想看完整啟動流程，再依 [後端環境建置](../../../README.md#啟動後端) 準備 `.env`、MySQL（MAMP／自行安裝／Docker 擇一）和練習資料。

這個練習直接使用團隊專案，避免新手另建一個版本與依賴不同的專案。

## 你會遇到的坑

**① 第一次跑超慢**
要下載幾百個檔案。正常，泡杯咖啡。

**② 下載到一半斷掉，之後一直失敗**
本機的快取壞了。
→ 刪掉 `~/.m2/repository` 底下那個套件的資料夾，重跑。

**③ 版本衝突**
兩個套件各自需要不同版本的同一個東西。
→ Spring Boot 的 parent 已經幫你管好大部分版本，**所以不要自己亂指定 version**，讓它用預設的。

**④ `pom.xml` 衝突**
兩個人同時加套件。
→ 所以只有 A 能改。

**⑤ Lombok 沒生效**
IntelliJ 要裝 Lombok 外掛，而且要開啟 Annotation Processing。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `Could not resolve dependencies` | 抓不到套件 | 網路問題，或名稱／版本打錯 |
| `Could not find artifact` | 中央倉庫沒這個東西 | 名稱打錯，去 [mvnrepository.com](https://mvnrepository.com/) 查正確寫法 |
| `Failed to execute goal ... compile` | 編譯失敗 | 往上找真正的 Java 錯誤訊息 |
| `cannot find symbol: method getXxx()` | 找不到方法 | 多半是 Lombok 沒生效 |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 購物清單 | `pom.xml` |
| 清單上的一項 | dependency 相依套件 |
| 套餐 | starter |
| 網路上的大倉庫 | Maven Central 中央倉庫 |
| 打包好的成品 | JAR 檔 |
| 專案自帶的 Maven | Maven Wrapper（`mvnw`） |

## 自我檢核

1. Maven 幫你做什麼？
2. starter 是什麼？為什麼 pom.xml 只有十幾行卻下載上百個檔案？
3. 為什麼要用 `./mvnw` 而不是 `mvn`？
4. 誰可以改 `pom.xml`？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [Spring Initializr](https://start.spring.io/) —— 直接玩最快 | 工具 | 入門 | 10 分 |
| [Spring Boot 零基礎入門（iThome 鐵人賽）](https://ithelp.ithome.com.tw/users/20151036/ironman/6130) | **繁中** | **入門** | 查用 |

## 相關頁面

[Java 與 JDK](12-Java與JDK.md)　[Spring Boot 是什麼](14-SpringBoot是什麼.md)　[課程 02：Maven](../../spring-boot/tutorial/unit-02-maven.html)
