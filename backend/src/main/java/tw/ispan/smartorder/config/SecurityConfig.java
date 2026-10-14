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
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import tw.ispan.smartorder.controller.SessionTokenFilter;
import tw.ispan.smartorder.repository.DingingSessionRepository;

/**
 * 教學階段先讓本機 API 可直接測試；正式環境要改成登入與權限規則。
 * R2 上傳 API 預設拒絕所有呼叫；只在本機展示時可用環境變數暫時開啟匿名存取。
 * SessionTokenFilter 以 new 的方式加入 security chain，類別上不要加 @Component，避免被重複註冊執行兩次。
 */
@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain apiSecurity(
            HttpSecurity http,
            DingingSessionRepository sessionRepo,
            @Value("${app.r2.allow-anonymous-uploads:false}") boolean allowAnonymousUploads) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.ignoringRequestMatchers("/api/**"))
                .authorizeHttpRequests(authorize -> {
                    // R2 上傳相關規則要放在 /api/** 之前，否則會先被 permitAll 吃掉
                    authorize.requestMatchers(HttpMethod.GET, "/api/uploads/config").permitAll();
                    if (allowAnonymousUploads) {
                        authorize.requestMatchers(HttpMethod.POST,
                                "/api/uploads/presign", "/api/uploads/complete").permitAll();
                    } else {
                        authorize.requestMatchers(HttpMethod.POST,
                                "/api/uploads/presign", "/api/uploads/complete").denyAll();
                    }
                    authorize.requestMatchers("/api/uploads/**").denyAll();

                    authorize
                            .requestMatchers(
                                    "/api/**",
                                    "/v3/api-docs/**",
                                    "/swagger-ui/**",
                                    "/swagger-ui.html",
                                    "/actuator/health",
                                    "/error"
                            ).permitAll()
                            .anyRequest().authenticated();
                })
                .addFilterBefore(new SessionTokenFilter(sessionRepo),
                        UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    /**
     * 前端 dev server（http://localhost:5173）和後端（:8080）不同來源，瀏覽器要後端明確放行才會送出請求。
     * 允許的標頭要包含前端共用層會帶的 X-Session-Token、X-Reservation-Token、X-Device-Id。
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
                "X-Reservation-Token",
                "X-Device-Id"
        ));
        configuration.setExposedHeaders(List.of("Location"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }
}
