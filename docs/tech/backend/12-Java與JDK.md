# Java 與 JDK

**難度** ★☆☆☆☆　**用在哪些模組** 所有後端工作　**哪幾週** 第 0 週

## 一句話

Java 是**程式語言**，JDK 是**寫 Java 需要的整套工具箱**。

## 想像一下

- **Java** = 中文（一種語言）
- **JDK** = 字典 + 稿紙 + 筆 + 印刷機（寫和出版需要的所有工具）
- **JVM** = 一台能讀中文的機器（任何裝了 JVM 的電腦都能跑你寫的程式）

Java 最有名的口號是「**Write once, run anywhere**」——寫一次，到處都能跑。原因就是 JVM：你的程式不是直接跑在 Windows 或 Mac 上，而是跑在 JVM 上，而 JVM 每個作業系統都有。

## 我們用哪個版本

**Java 17**（LTS 版本）。

| 名詞 | 意思 |
|---|---|
| **LTS** | Long Term Support，長期支援版，比較穩、公司多半用這個 |
| Java 8 / 11 / 17 / 21 | 都是 LTS，但 Spring Boot 3 最低要求 17 |

**五個人一定要裝同一個版本。** 版本不同會出現「我這邊可以編譯，你那邊不行」的鬼故事。

## 怎麼確認裝好了

```bash
java -version
```

看到類似這樣就對了：

```
openjdk version "17.0.x"
```

如果顯示 1.8 或 11，去換成 17。

## 你會用到的 Java 語法

你們已經學過 Java 基礎，這裡只提醒幾個在 Spring Boot 專案裡天天出現的：

**註解（Annotation）—— 那些 `@` 開頭的東西**

```java
@RestController        // 告訴 Spring：這是一個 API 控制器
@Service               // 告訴 Spring：這是商業邏輯層
@Transactional         // 告訴 Spring：這個方法要包在交易裡
```

這些不是普通的程式碼，它們是**貼在程式上的標籤**，Spring 會讀這些標籤決定怎麼處理。看到 `@` 就想「這是一張標籤」。

**列舉（enum）**

```java
public enum SessionStatus {
    OPEN, PAID, CANCELLED      // 用餐中、已結清、已取消（沒有「結帳中」）
}
```

我們的狀態機大量使用。比用字串安全，因為打錯字編譯就不會過。

**BigDecimal（算錢專用）**

```java
BigDecimal price = new BigDecimal("280.00");
BigDecimal total = price.multiply(BigDecimal.valueOf(2));  // 560.00
```

**算錢絕對不能用 `double`。** `0.1 + 0.2` 在電腦裡是 `0.30000000000000004`，帳單會對不起來。

## 15 分鐘動手小練習

1. 裝 JDK 17（建議用 [Adoptium Temurin](https://adoptium.net/)，免費且乾淨）
2. 裝 IntelliJ IDEA Community 版（免費）
3. 打 `java -version` 確認是 17
4. 在 IntelliJ 建一個空的 Java 專案，跑一次 `System.out.println("Hello")`
5. 試試看這段，親眼看到浮點數問題：

```java
System.out.println(0.1 + 0.2);
// 印出 0.30000000000000004 ← 這就是為什麼算錢要用 BigDecimal
```

## 你會遇到的坑

**① 電腦裡有好幾個 Java 版本**
`java -version` 顯示的跟 IntelliJ 用的不一樣。
→ 在 IntelliJ 的 Project Structure 裡明確指定 SDK 為 17。

**② `JAVA_HOME` 沒設**
Maven 會找不到 Java。

**③ 用 double 算錢**
第 3 週結帳金額對不起來，找一整天。

**④ 中文變亂碼**
檔案編碼要統一用 UTF-8（IntelliJ 預設就是）。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `UnsupportedClassVersionError` | 編譯用的版本比執行的新 | 統一成 Java 17 |
| `JAVA_HOME is not set` | 系統不知道 Java 裝在哪 | 設定環境變數 |
| `java: command not found` | 根本沒裝，或沒加進 PATH | 重裝 JDK |
| `NullPointerException` | 你對一個「沒有東西」的變數動手 | 檢查那個變數是不是 null |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 整套工具箱 | JDK（Java Development Kit） |
| 跑 Java 的機器 | JVM（Java Virtual Machine） |
| 長期支援版 | LTS |
| `@` 開頭的標籤 | Annotation 註解 |
| 算錢專用的數字 | BigDecimal |

## 自我檢核

1. JDK 和 JVM 差在哪？
2. 我們用哪個 Java 版本？為什麼五個人要一樣？
3. `@RestController` 這種東西是什麼？
4. 為什麼算錢不能用 double？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| 你們課程的 Java 教材（複習就好） | 繁中 | — | — |
| [Adoptium Temurin 下載](https://adoptium.net/) | 英文 | — | 10 分 |

## 相關頁面

[Maven 與相依套件](13-Maven.md)　[Spring Boot 是什麼](14-SpringBoot是什麼.md)
