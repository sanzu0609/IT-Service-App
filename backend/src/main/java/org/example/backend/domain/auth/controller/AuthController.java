package org.example.backend.domain.auth.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.Optional;
import org.example.backend.domain.auth.dto.request.LoginRequest;
import org.example.backend.domain.auth.dto.response.AuthUserResponse;
import org.example.backend.domain.auth.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST Controller xử lý các API liên quan đến authentication
 * - POST /api/auth/login: Đăng nhập
 * - POST /api/auth/logout: Đăng xuất
 * - GET /api/auth/me: Lấy thông tin user hiện tại
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * API đăng nhập
     * Client gửi username/password, server trả về user info + set session cookies
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest
    ) {
        try {
            // Gọi AuthService để xử lý login logic
            AuthUserResponse response = authService.login(request, httpRequest);
            return ResponseEntity.ok(response);
        } catch (AuthenticationException ex) {
            // Trả về 401 với error message nếu login thất bại
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "code", "AUTH_BAD_CREDENTIALS",
                            "message", "Invalid username or password"
                    ));
        }
    }

    /**
     * API đăng xuất
     * Xóa session và security context
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        authService.logout(request, response);
        return ResponseEntity.noContent().build();
    }

    /**
     * API lấy thông tin user hiện tại
     * Sử dụng Authentication object từ Spring Security context
     */
    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {
        Optional<AuthUserResponse> user = authService.getCurrentUser(authentication);
        return user.<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of(
                                "code", "UNAUTHORIZED",
                                "message", "User is not authenticated"
                        )));
    }
}
