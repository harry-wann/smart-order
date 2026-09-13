# JWT 與登入狀態

**難度** ★★★☆☆　**用在哪些模組** M8，前端串接時也要懂　**哪幾週** 第 4 週

## 一句話

JWT 就是一張**有防偽簽章的臨時識別證**，上面寫著你是誰，伺服器一看就認得。

## 想像一下

你去遊樂園。買票之後，工作人員在你手上蓋一個螢光章。

之後你要進任何一個設施，工作人員拿紫外線燈一照——章是真的，放行。

重點是：**工作人員不需要打電話回售票處查你有沒有買票**。章本身就是證明，因為章有防偽（別人蓋不出一模一樣的）。

JWT 就是那個章。

## 為什麼不用傳統的 session

| | 傳統 Session | JWT |
|---|---|---|
| 資料存在哪 | **伺服器記憶體**裡 | **使用者手上** |
| 伺服器要記住你嗎 | 要 | 不用 |
| 開兩台伺服器 | 麻煩（要共用 session） | 沒差 |
| 手機 App 用 | 麻煩（cookie） | 簡單 |
| 能主動讓它失效 | 可以（刪掉 session） | **不行**（要另外做黑名單） |

我們選 JWT，因為前後端分離 + 可能多台伺服器。

## 它長什麼樣

```
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMDUyIiwicm9sZSI6Ik1FTUJFUiIsImV4cCI6MTc2OTk5OTk5OX0.xK3f...
└────── 標頭 ──────┘ └──────────────── 內容 ────────────────┘ └─ 簽章 ─┘
```

用兩個點分成三段：

| 段 | 內容 | 加密了嗎 |
|---|---|---|
| **標頭** | 用什麼演算法簽的 | **沒有** |
| **內容** | 你是誰、什麼角色、什麼時候過期 | **沒有！只是編碼** |
| **簽章** | 防偽章 | 這段保證前兩段沒被竄改 |

## 最重要的一件事

> **JWT 的內容是「可以被任何人看見」的，只是不能被竄改。**

那串看起來亂七八糟的東西，貼到 [jwt.io](https://jwt.io/) 就能看到裡面寫什麼。它只是 Base64 編碼，不是加密。

所以：

- ✅ 可以放：使用者 ID、角色、過期時間
- ❌ **絕對不能放**：密碼、身分證字號、任何機密

竄改為什麼不行？因為簽章是用**只有伺服器知道的密鑰**算出來的。你改了內容，簽章就對不上，伺服器一驗就知道。

## 我們的流程

```
① 使用者輸入手機 → 收到驗證碼 → 輸入驗證碼
        ↓
② 後端確認驗證碼正確
        ↓
③ 後端產生 JWT：{ sub: "會員ID", role: "MEMBER", exp: 七天後 }
   用密鑰簽名
        ↓
④ 回傳給前端，前端存進 localStorage
        ↓
⑤ 之後每次請求都帶：Authorization: Bearer eyJhbGci...
        ↓
⑥ 後端的 filter 驗簽章、看有沒有過期 → 知道你是誰
```

## 後端怎麼寫

```java
@Component
public class JwtService {

    @Value("${smartorder.jwt.secret}")     // 從設定檔讀，不要寫死
    private String secret;

    public String generate(Long userId, String role, Duration validFor) {
        return Jwts.builder()
            .subject(String.valueOf(userId))
            .claim("role", role)
            .issuedAt(new Date())
            .expiration(Date.from(Instant.now().plus(validFor)))
            .signWith(key())
            .compact();
    }

    public Claims parse(String token) {          // 驗簽 + 解析，失敗會丟例外
        return Jwts.parser().verifyWith(key()).build()
                   .parseSignedClaims(token).getPayload();
    }
}
```

## 前端怎麼用

```js
// 登入成功後存起來
localStorage.setItem('jwt', data.token);

// 每次請求帶上（統一封裝在 api/client.js，不要每頁自己寫）
const headers = { 'Content-Type': 'application/json' };
const token = localStorage.getItem('jwt');
if (token) headers['Authorization'] = `Bearer ${token}`;

// 收到 401 就導回登入頁
if (res.status === 401) {
  localStorage.removeItem('jwt');
  navigate('/auth/login');
}
```

## Refresh Token 是什麼

JWT 沒辦法主動作廢，所以效期不能設太長（否則被偷了很久都有效）。但效期太短使用者又要一直重新登入。

折衷方案是發兩張：

| | Access Token | Refresh Token |
|---|---|---|
| 效期 | 短（15 分鐘～幾小時） | 長（7～30 天） |
| 用途 | 每次請求都帶 | 只在換新的 access token 時用 |
| 存在哪 | localStorage | localStorage（或 httpOnly cookie） |

Access token 過期 → 前端拿 refresh token 去換一張新的 → 使用者無感。

**我們的做法**：會員 access token 7 天，先不做 refresh 輪替（那是進階題，見 [00-架構分層](../../spec/00-架構分層與技術選型.md) 的「不建議花時間的事」）。員工 token 12 小時，過期就重新登入。

## 15 分鐘動手小練習

1. 去 [jwt.io](https://jwt.io/)
2. 左邊的框已經有一個範例 token，看右邊自動解出來的內容
3. **改右邊 Payload 的內容**（例如把 role 改成 admin）
4. 注意左邊的 token 跟著變了，而且下面顯示 **Invalid Signature**
5. 在下面 Verify Signature 填入正確的密鑰，就變成 Verified

**這五步讓你同時理解兩件事**：內容誰都看得到，但改了就會被抓到。

## 你會遇到的坑

**① 把機密放進 JWT**
所有人都看得到。

**② 密鑰寫在程式碼裡並 commit**
任何人拿到你的 repo 就能偽造 token。
→ 放環境變數或 `application-local.yml`（加進 `.gitignore`）。

**③ 密鑰太短**
HS256 建議至少 256 bit（32 個字元以上），太短會直接噴錯。

**④ 前端沒處理 401**
token 過期了，使用者一直看到錯誤但不知道要重新登入。
→ 在統一的 `client.js` 裡處理。

**⑤ 沒設過期時間**
永久有效的 token 等於永久的安全漏洞。

**⑥ 以為登出就安全了**
前端刪掉 token，但那張 token 在過期前**仍然有效**。真的要作廢需要黑名單（用 [Redis](../realtime/44-Redis.md) 存）。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `ExpiredJwtException` | 過期了 | 正常，回 401 讓前端重新登入 |
| `SignatureException` | 簽章對不上 | 密鑰不一致，或 token 被改過 |
| `MalformedJwtException` | 格式不對 | 前端傳錯，檢查有沒有漏掉 `Bearer ` 前綴 |
| `The signing key's size is not secure enough` | 密鑰太短 | 換一個 32 字元以上的 |
| 前端一直 401 | 沒帶 token 或格式錯 | F12 Network 看 Request Headers |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 有防偽章的識別證 | JWT（JSON Web Token） |
| 章上寫的內容 | Payload / Claims |
| 防偽章 | Signature 簽章 |
| 只有伺服器知道的印章 | Secret Key 密鑰 |
| 過期時間 | `exp` claim |
| 換新證用的 | Refresh Token |
| 不記住你是誰 | Stateless |

## 自我檢核

1. JWT 的內容是加密的嗎？
2. 哪些東西絕對不能放進 JWT？
3. 為什麼別人改了 JWT 的內容會被抓到？
4. 使用者按了登出，那張 token 立刻失效嗎？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [jwt.io 官方互動工具](https://jwt.io/) | 英文（但用看的就懂） | 入門 | 10 分 |
| [Spring Boot 零基礎入門 — JWT 篇章](https://ithelp.ithome.com.tw/users/20151036/ironman/6130) | 繁中 | 中階 | 30 分 |

## 相關頁面

[Spring Security 基礎](20-SpringSecurity.md)　[HTTP 狀態碼](../web/08-HTTP狀態碼.md)　[fetch 串接後端 API](../frontend/40-fetch串接API.md)
