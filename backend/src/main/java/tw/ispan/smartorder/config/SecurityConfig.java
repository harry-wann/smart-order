package tw.ispan.smartorder.config;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.OffsetDateTime;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import tw.ispan.smartorder.controller.SessionTokenFilter;
import tw.ispan.smartorder.repository.DiningSessionRepository;
import tw.ispan.smartorder.repository.DiningSessionGuestRepository;
import tw.ispan.smartorder.staff.security.StaffJwtFilter;
import tw.ispan.smartorder.staff.security.StaffJwtProvider;
import tw.ispan.smartorder.util.JwtToken;

/**
 * 教學階段先讓本機 API 可直接測試；正式環境要改成登入與權限規則。
 * R2 上傳 API（簽發、確認）與菜單管理 API（/api/order/admin）只給店長（MANAGER），沒有匿名開關。
 * SessionTokenFilter、StaffJwtFilter 以 new 的方式加入 security chain，類別上不要加 @Component，避免被重複註冊執行兩次。
 * 店家端目前只有訂位、出餐、菜單管理等路徑要員工 JWT；其他店家端 API 等各自接上登入後再加進來。
 */
@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain apiSecurity(
            HttpSecurity http,
            DiningSessionRepository sessionRepo,
            DiningSessionGuestRepository guestRepo,
            StaffJwtProvider staffJwtProvider,
            JwtToken jwtToken) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.ignoringRequestMatchers("/api/**"))
                .authorizeHttpRequests(authorize -> {
                    // R2 上傳相關規則要放在 /api/** 之前，否則會先被 permitAll 吃掉。
                    // 簽發、確認上傳會寫進公開 bucket（菜單圖片用），只給店長，不能匿名；
                    // 其他沒列出的 /api/uploads 路徑一律拒絕
                    authorize.requestMatchers(HttpMethod.GET, "/api/uploads/config").permitAll();
                    authorize.requestMatchers(HttpMethod.POST,
                            "/api/uploads/presign", "/api/uploads/complete").hasRole("MANAGER");
                    authorize.requestMatchers("/api/uploads/**").denyAll();

                    // 員工登入；以下店家端規則都要放在 /api/** 之前（規則由上往下比，第一條符合就用，
                    // 擺後面會先被 /api/** 的 permitAll 吃掉）。login 要放行，不然沒登入就被擋，永遠登不進去
                    authorize.requestMatchers(HttpMethod.POST, "/api/admin/auth/login").permitAll();
                    authorize.requestMatchers("/api/admin/kitchen/**").hasAnyRole("KITCHEN", "MANAGER");
                    authorize.requestMatchers(HttpMethod.PATCH, "/api/admin/order-items/*/serve")
                            .hasAnyRole("KITCHEN", "MANAGER");
                    authorize.requestMatchers(HttpMethod.PATCH, "/api/admin/order-items/*/unserve")
                            .hasAnyRole("KITCHEN", "MANAGER");
                    // 出菜看板報廢／退菜：會改帳單、庫存不回補，只給廚房與店長（04 §2.4）
                    authorize.requestMatchers(HttpMethod.PATCH, "/api/admin/order-items/*/waste")
                            .hasAnyRole("KITCHEN", "MANAGER");
                    authorize.requestMatchers(HttpMethod.PATCH, "/api/admin/order-items/*/cancel")
                            .hasAnyRole("COUNTER", "MANAGER", "KITCHEN");
                    authorize.requestMatchers(HttpMethod.GET, "/api/admin/tables/*/detail")
                            .hasAnyRole("COUNTER", "MANAGER");
                    authorize.requestMatchers(HttpMethod.GET, "/api/admin/dining-sessions/*")
                            .hasAnyRole("COUNTER", "MANAGER");
                    authorize.requestMatchers(HttpMethod.POST, "/api/admin/dining-sessions/*/orders")
                            .hasAnyRole("COUNTER", "MANAGER");
                    authorize.requestMatchers(HttpMethod.POST, "/api/admin/dining-sessions/*/settle")
                            .hasAnyRole("COUNTER", "MANAGER");
                    authorize.requestMatchers(HttpMethod.POST, "/api/admin/dining-sessions/*/cancel")
                            .hasRole("MANAGER");
                    // 只替訂位用到的路徑加角色，不寫成 /api/admin/** 一把鎖：隊友的店家端 API 還沒接登入，
                    // 一起鎖起來他們的頁面會全部 401，等各自接好再一條一條加進來。
                    // hasRole 比對的是 ROLE_ 開頭的 authority，由 StaffJwtFilter 組給 Spring Security
                    authorize.requestMatchers("/api/admin/reservations/**").hasAnyRole("COUNTER", "MANAGER");
                    // 排程手動觸發會一次改一批訂位的狀態（例如 NO_SHOW），只給店長
                    authorize.requestMatchers("/api/admin/scheduler/**").hasRole("MANAGER");
                    authorize.requestMatchers(HttpMethod.GET, "/api/admin/tables-config", "/api/admin/tables-config/**")
                            .hasAnyRole("COUNTER", "MANAGER");
                    authorize.requestMatchers("/api/admin/tables-config", "/api/admin/tables-config/**")
                            .hasRole("MANAGER");
                    authorize.requestMatchers("/api/admin/waitlist", "/api/admin/waitlist/**")
                            .hasAnyRole("COUNTER", "MANAGER");
                    authorize.requestMatchers("/api/admin/tables", "/api/admin/tables/**")
                            .hasAnyRole("COUNTER", "MANAGER");
                    // 菜單管理（分類、品項、選項群組）：實際掛在 /api/order/admin/**（規格寫 /api/admin/menu/**，
                    // 以實作為準）。所有動詞都要店長，包含 GET——後台清單含停用的分類與品項，不能給匿名者看。
                    // 同一個 controller 的顧客端查詢（/api/order/category、/items…）不在這個前綴下，維持公開
                    authorize.requestMatchers("/api/order/admin/**").hasRole("MANAGER");

                    authorize
                            .requestMatchers(
                                    "/api/**",
                                    "/v3/api-docs/**",
                                    "/swagger-ui/**",
                                    "/swagger-ui.html",
                                    "/actuator/health",
                                    // WebSocket 連線入口（桌況、購物車推播），握手時還沒有權杖，先放行
                                    "/ws/**",
                                    "/error"
                            ).permitAll()
                            .anyRequest().authenticated();
                })
                // 沒登入（或 token 過期、被改過）而被擋下來的請求回 401 JSON，前端看到 401 會清掉員工權杖、導回登入頁。
                // 注意範圍比下面列出的路徑大：ExceptionHandlingConfigurer 沒有另外設預設 entry point 時，
                // 會拿「第一個登記的」當預設（Spring Security 7.1.1 實測行為），所以其他匿名被擋的路徑
                // （例如 denyAll 的其他 /api/uploads 路徑）也是回 401，不是 403。
                // 下面照樣把店家端路徑逐一列出，是為了讓意圖寫在程式裡，不要靠預設值的副作用。
                // 登入了但角色不夠（例如 COUNTER 去按排程）走 accessDeniedHandler 回 403，
                // 前端只顯示「權限不足」，不能跟 401 混在一起導回登入頁
                .exceptionHandling(handling -> {
                    AuthenticationEntryPoint unauthorized = (request, response, exception) ->
                            writeError(request, response, 401, "UNAUTHORIZED", "請先登入");
                    for (String pattern : List.of(
                            "/api/admin/**", "/api/order/admin/**", "/api/uploads/presign", "/api/uploads/complete")) {
                        handling.defaultAuthenticationEntryPointFor(
                                unauthorized, PathPatternRequestMatcher.withDefaults().matcher(pattern));
                    }
                    handling.accessDeniedHandler((request, response, exception) ->
                            writeError(request, response, 403, "FORBIDDEN", "權限不足"));
                })
                .addFilterBefore(new SessionTokenFilter(sessionRepo, guestRepo, jwtToken),
                        UsernamePasswordAuthenticationFilter.class)
                // StaffJwtFilter 自己只處理店家端路徑（/api/admin/、/api/order/admin/、/api/uploads/），
                // 跟上面 SessionTokenFilter 的顧客端權杖各管各的
                .addFilterBefore(new StaffJwtFilter(staffJwtProvider),
                        UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    // 格式同 04 §1.2；message、path 都是固定值或伺服器端的路徑，直接組字串。
    // 這是 filter 層的錯誤，進不了 ApiExceptionAdvice（那邊只接 controller 丟的例外），所以自己寫；
    // 沒有 details，跟 ErrorResponse 在 details 為空時不輸出該欄位的結果一樣，前端看到的格式一致。
    // contentType 要帶 charset，不然 getWriter 預設編碼會讓中文 message 變亂碼
    private static void writeError(HttpServletRequest request, HttpServletResponse response,
                                   int status, String code, String message) throws java.io.IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"timestamp\":\"" + OffsetDateTime.now() + "\",\"status\":" + status
                + ",\"code\":\"" + code + "\",\"message\":\"" + message
                + "\",\"path\":\"" + request.getRequestURI() + "\"}");
    }

    /**
     * 前端 dev server（http://localhost:5173）和後端（:8080）不同來源，瀏覽器要後端明確放行才會送出請求。
     * 允許的標頭要包含前端共用層會帶的 X-Session-Token、X-Guest-Token、X-Reservation-Token、X-Device-Id。
     */
    @Bean
    CorsConfigurationSource corsConfigurationSource(
            @Value("${app.cors.allowed-origins}") List<String> allowedOrigins) {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of(
                "Authorization",
                "Content-Type",
                "X-Session-Token",
                "X-Guest-Token",
                "X-Reservation-Token",
                "X-Device-Id"
        ));
        configuration.setExposedHeaders(List.of("Location"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }
}
