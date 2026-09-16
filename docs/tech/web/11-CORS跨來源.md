# CORS 跨來源問題

**難度** ★★☆☆☆　**用在哪些模組** 全員（第一次串 API 必遇）　**哪幾週** 第 1 週（L0）、第 5 週（部署）

## 一句話

CORS 是**瀏覽器的門禁**：它不准網頁隨便去別人家要資料，除非對方說「這個人可以」。

## 想像一下

你在 `evil.com` 這個網站上。它偷偷寫了一段程式，去你的網路銀行要你的帳戶資料。

如果瀏覽器不管，那就完蛋了。所以瀏覽器立了一條規矩：

> **網頁只能跟「同一個來源」的伺服器要資料。要跟別人要，對方必須明確說「我允許」。**

「同一個來源」是指**協定、網域、埠號三個都一樣**：

| 網頁在 | 想要資料的地方 | 同源嗎 |
|---|---|---|
| `http://localhost:5173` | `http://localhost:5173` | ✅ |
| `http://localhost:5173` | `http://localhost:8080` | ❌ **埠號不同** |
| `https://a.com` | `http://a.com` | ❌ 協定不同 |
| `https://a.com` | `https://api.a.com` | ❌ 網域不同 |

## 為什麼你一定會遇到

我們的開發環境：

- 前端 React 跑在 `http://localhost:5173`
- 後端 Spring Boot 跑在 `http://localhost:8080`

**埠號不一樣 = 不同來源 = 被擋。**

所以你第一次串 API 的時候，100% 會看到那個紅色錯誤。**這不是你寫錯，是正常的。**

## 錯誤長這樣

```
Access to fetch at 'http://localhost:8080/api/menu/items'
from origin 'http://localhost:5173' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

翻譯成中文：

> 你的網頁（5173）想去 8080 要東西，但 8080 沒說「我允許 5173」，所以我擋下來了。

## 關鍵觀念：這是**後端**要解決的

很多新手會在前端東試西試。沒用。

**門禁是瀏覽器在執行，但「允許誰進來」是後端說了算。** 所以修改在後端。

Spring Boot 的做法（屬於技術地基，寫一次全隊受惠）：

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(
                    "http://localhost:5173",      // 顧客端開發
                    "http://localhost:5174",      // 店家端開發
                    "https://your-app.vercel.app" // 正式環境
                )
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
```

## 那個多出來的 OPTIONS 請求

你在 Network 分頁可能會看到，每次 POST 之前都多一個 `OPTIONS` 請求。

那叫**預檢（preflight）**。瀏覽器在正式送出之前先去問一句：「我等一下要用 POST 送 JSON，可以嗎？」後端回答可以，才會真的送。

**這是正常的，不是 bug。** 但它代表兩件事：
- `allowedMethods` 一定要包含 `OPTIONS`
- 每個 POST 其實是兩個請求，所以本機開發會覺得有點慢

## 15 分鐘動手小練習

親手製造一次 CORS 錯誤：

1. 打開任何網站，F12 → Console
2. 貼上這段：

```js
fetch('https://api.github.com/users/octocat')
  .then(r => r.json())
  .then(console.log)
```

GitHub 的 API 有開放 CORS，所以**會成功**。

3. 換一個沒開放的網址再試一次，你就會看到紅色的 CORS 錯誤

看過一次，以後在專案裡遇到就認得出來了。

## 你會遇到的坑

**① 在前端找解法**
翻了兩小時的 StackOverflow 都沒用。**去改後端。**

**② 用 `allowedOrigins("*")` 加上 `allowCredentials(true)`**
這兩個不能同時用，瀏覽器會拒絕。要帶 cookie／token 的話，`allowedOrigins` 必須寫明確的網址。

**③ 部署後又壞了**
正式環境的前端網址（例如 `https://xxx.vercel.app`）忘記加進 `allowedOrigins`。
→ **第 5 週部署時一定會遇到，先寫在待辦清單上。**

**④ 以為 CORS 是安全機制**
CORS 只擋瀏覽器。用 Postman 或 curl 打你的 API 完全不受影響。
→ **真正的權限控管要靠 [Spring Security](../backend/20-SpringSecurity.md)。**

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `No 'Access-Control-Allow-Origin' header` | 後端沒說允許你 | 後端加 CORS 設定 |
| `The value of 'Access-Control-Allow-Origin' header ... must not be the wildcard '*' when credentials mode is 'include'` | `*` 不能配 credentials | 寫明確的網址 |
| `Method PATCH is not allowed by Access-Control-Allow-Methods` | 沒允許這個方法 | `allowedMethods` 加上 PATCH |
| `Request header field x-session-token is not allowed` | 沒允許這個標頭 | `allowedHeaders("*")` |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 門禁 | CORS（Cross-Origin Resource Sharing） |
| 同一個來源 | same-origin（協定＋網域＋埠號都一樣） |
| 先問一句可不可以 | preflight 預檢請求（OPTIONS） |
| 我允許這些網站 | `Access-Control-Allow-Origin` |

## 自我檢核

1. `localhost:5173` 和 `localhost:8080` 算同源嗎？為什麼？
2. CORS 要在前端還是後端修？
3. 那個多出來的 OPTIONS 請求是什麼？
4. CORS 擋得住 Postman 嗎？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [MDN：跨來源資源共用 CORS](https://developer.mozilla.org/zh-TW/docs/Web/HTTP/Guides/CORS) | 繁中 | 入門～中階 | 25 分 |

## 相關頁面

[HTTP 請求與回應](07-HTTP請求與回應.md)　[Spring Security 基礎](../backend/20-SpringSecurity.md)　[fetch 串接後端 API](../frontend/40-fetch串接API.md)　[部署上線](../quality/50-部署上線.md)
