# Spring Security 基礎

**難度** ★★★★☆　**用在哪些模組** 技術地基 L0、M2、M8　**哪幾週** 第 1 週、第 4 週

## 一句話

Spring Security 是**站在所有 API 門口的警衛**：先檢查你是誰、能不能進去，才放你進 Controller。

## 想像一下

餐廳後場有三道門：

- **廚房**：只有廚師能進
- **櫃檯收銀**：只有櫃檯和店長能進
- **辦公室**：只有店長能進

警衛站在門口，看你的識別證決定放不放行。**你根本進不去，所以不需要在廚房裡再檢查一次。**

Spring Security 就是那個警衛。請求還沒到你的 Controller，它就先攔下來檢查。

## 兩件事：你是誰、你能幹嘛

| 白話 | 正式名稱 | 對應的問題 |
|---|---|---|
| 你是誰 | **認證** Authentication | 帳密對嗎？token 有效嗎？ |
| 你能幹嘛 | **授權** Authorization | 這個角色可以打這支 API 嗎？ |

**401 = 認證失敗**（不知道你是誰）
**403 = 授權失敗**（知道你是誰，但你不能做這件事）

## 我們有四種身分

這是我們專案比較特別的地方——**顧客不需要註冊也能點餐、也能訂位**，所以除了 JWT，還有兩種「建立時發下去的隨機權杖」並存：

| 身分 | 怎麼證明 | 有效期 |
|---|---|---|
| **匿名顧客（用餐）** | `X-Session-Token` 標頭（掃碼加入時發的用餐權杖） | 到這次結帳為止 |
| **匿名訂位** | `X-Reservation-Token` 標頭（建立訂位時發的，存 localStorage） | 到這筆訂位結束為止 |
| **會員** | `Authorization: Bearer <JWT>` | 7 天 |
| **員工** | `Authorization: Bearer <JWT>` + 角色 | 12 小時 |

顧客端可以**同時帶兩個**：用餐權杖說「我坐在 A03 桌」，JWT 說「我是誰」。

> 顧客手機每個請求還會帶 `X-Device-Id`（第一次開啟時產生、存在 localStorage 的裝置代號）。它**不是身分**，
> 只拿來標示整桌共用購物車裡「誰加的」，被偽造頂多顯示錯名字；能不能動這桌的購物車，看的還是 `X-Session-Token`。
>
> 購物車也**不放 HTTP session**（下面設定就是 `STATELESS`）：HTTP session 是每支手機各一份，同桌看不到彼此加了什麼，伺服器重開也會不見。購物車存在資料庫的 `cart_item`。

## 設定長什麼樣

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity            // 開啟 @PreAuthorize
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final SessionTokenFilter sessionTokenFilter;
    private final ReservationTokenFilter reservationTokenFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())          // 我們用 token，不用 cookie，所以關掉
            .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))  // 不存 session
            .authorizeHttpRequests(auth -> auth
                // 完全開放（一定要寫在 /api/admin/** 那行之前：規則由上往下比，先符合的先算）
                .requestMatchers("/api/tables/*/status",
                                 "/api/dining-sessions/join",
                                 "/api/reservations",               // 不登入也能訂位
                                 "/api/reservations/availability",
                                 "/api/auth/**",
                                 "/api/admin/auth/login",           // 員工登入：還沒登入才要打它
                                 "/ws/**").permitAll()              // WebSocket 握手；身分在 CONNECT frame 驗
                // 菜單公開讀取（進階 A7 人氣推薦的 HISTORY／PROFILE 要知道你是誰，在 Controller 裡另外檢查會員 JWT）
                .requestMatchers(HttpMethod.GET, "/api/menu/**").permitAll()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                // 店家端要員工身分
                .requestMatchers("/api/admin/**").authenticated()
                // 其他都要認證
                .anyRequest().authenticated()
            )
            .addFilterBefore(sessionTokenFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(reservationTokenFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();       // 密碼一律雜湊，不存明碼
    }
}
```

## 角色檢查

```java
@PreAuthorize("hasAnyRole('COUNTER', 'MANAGER')")
@PostMapping("/api/admin/tables/{id}/open")
public void openTable(@PathVariable Long id) { ... }

@PreAuthorize("hasRole('MANAGER')")
@PostMapping("/api/admin/menu/items")
public MenuItemDto create(@RequestBody CreateMenuItemRequest req) { ... }
```

**一行就搞定。** 不符合角色的人會拿到 403。

## 最重要的觀念

> **前端把按鈕藏起來，不等於後端擋住了。**

廚房人員的畫面上沒有「修改菜單」按鈕，但他只要打開 Postman，直接打 `POST /api/admin/menu/items`，如果後端沒擋，他就改得了。

**每一支 `/api/admin/**` 的 API 都必須有角色檢查**（員工登入 `/api/admin/auth/login` 除外）。這是驗收項目。

## 密碼怎麼存

**絕對不要存明碼。** 用 BCrypt 雜湊：

```java
// 建立員工帳號時（會員只用手機驗證碼登入，沒有密碼）
String hash = passwordEncoder.encode("1234");
// 存進資料庫的是 $2a$10$N9qo8uLOickgx2ZMRZoMy...

// 登入時
boolean ok = passwordEncoder.matches(輸入的密碼, 資料庫裡的hash);
```

BCrypt 是**單向**的——可以驗證，但沒辦法從雜湊反推回密碼。就算資料庫外洩，密碼也還算安全。

## 15 分鐘動手小練習

1. 在 Hello 專案加上 `spring-boot-starter-security`
2. **什麼都不設定就重啟** ——打開 `/hello`，會跳出登入框
3. 看 console，Spring 印了一個隨機密碼，帳號是 `user`
4. 登入進去
5. 加上上面的 `SecurityConfig`，把 `/hello` 設成 `permitAll()`
6. 重啟，`/hello` 就不用登入了

**第 2 步那個「什麼都沒做就全部被鎖住」的體驗很重要**——Spring Security 的預設是「全部擋住」，這是好事。

## 你會遇到的坑

**① 加了 Security 之後全部 403/401**
預設就是全擋。要明確 `permitAll()` 你要開放的路徑。

**② Swagger 打不開**
記得放行 `/swagger-ui/**` 和 `/v3/api-docs/**`。

**③ CORS 突然失效**
Security 的 filter 在 CORS 之前跑。
→ 在 SecurityConfig 裡加 `.cors(Customizer.withDefaults())`。

**④ CSRF 導致 POST 全部 403**
前後端分離用 token 的架構不需要 CSRF。
→ `.csrf(csrf -> csrf.disable())`。

**⑤ 只在前端擋權限**
最嚴重的錯誤。

**⑥ 把 JWT 密鑰寫在程式碼裡 commit 上去**
→ 放 `application-local.yml` 並加進 `.gitignore`，正式環境用環境變數。

**⑦ 員工永遠登入不了**
`/api/admin/auth/login` 落在 `/api/admin/**` 底下，沒放行的話要先登入才能打登入 API。
→ 把它加進 `permitAll()`，而且要寫在 `/api/admin/**` 那一行**之前**。

**⑧ WebSocket 一連就 401，KDS、櫃檯、手機都收不到推播**
WebSocket 的 HTTP 握手（升級請求）不會帶我們的權杖標頭，`anyRequest().authenticated()` 會在握手階段就擋掉。
→ `/ws/**` 要 `permitAll()`；身分改在 STOMP 的 CONNECT frame 裡驗（`ChannelInterceptor`，見 [WebSocket 與 STOMP](../realtime/41-WebSocket與STOMP.md)）。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| 全部 API 都跳登入框 | 沒設定 permitAll | 寫 SecurityConfig |
| `403 Forbidden` 打 POST | CSRF 擋的 | `.csrf().disable()` |
| `401` 但你有帶 token | filter 沒把身分放進 SecurityContext | 檢查你的 JwtAuthFilter |
| `Access Denied` | 角色不符 | 檢查 `@PreAuthorize` 和使用者的角色 |
| CORS 錯誤在加了 Security 之後出現 | Security 的 CORS 沒開 | `.cors(Customizer.withDefaults())` |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 你是誰 | Authentication 認證 |
| 你能幹嘛 | Authorization 授權 |
| 門口的警衛 | Filter Chain 過濾器鏈 |
| 不記住你是誰，每次都要帶證明 | Stateless 無狀態 |
| 密碼雜湊 | BCrypt / PasswordEncoder |
| 角色 | Role / Authority |

## 自我檢核

1. 401 和 403 各代表什麼？
2. 為什麼前端藏起來的按鈕不算權限控管？
3. 密碼為什麼要用 BCrypt 而不是直接存？
4. 加了 Security 之後 Swagger 打不開，要改什麼？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [Spring Boot 零基礎入門 — Security 篇章](https://ithelp.ithome.com.tw/users/20151036/ironman/6130) | 繁中 | 中階 | 40 分 |
| [Spring Security 官方文件](https://docs.spring.io/spring-security/reference/) | 英文 | 中階～進階 | 查用 |

> 這頁是後端最難的一頁之一。**建議兩個人一起研究**，設定寫一次全隊受惠。

## 相關頁面

[JWT 與登入狀態](21-JWT.md)　[HTTP 狀態碼](../web/08-HTTP狀態碼.md)　[CORS 跨來源問題](../web/11-CORS跨來源.md)
