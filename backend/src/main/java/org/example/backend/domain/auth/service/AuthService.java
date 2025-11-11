package org.example.backend.domain.auth.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.util.Optional;
import org.example.backend.domain.auth.dto.request.LoginRequest;
import org.example.backend.domain.auth.dto.response.AuthUserResponse;
import org.example.backend.domain.department.dto.DepartmentLiteDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.stereotype.Service;

/**
 * Service xử lý authentication (đăng nhập/xác thực người dùng)
 * Sử dụng session-based authentication thay vì JWT
 * Tích hợp với Spring Security để quản lý authentication state
 */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private final AuthenticationManager authenticationManager;

    public AuthService(AuthenticationManager authenticationManager) {
        this.authenticationManager = authenticationManager;
    }

    /**
     * Xử lý đăng nhập người dùng
     * @param request chứa username và password từ client
     * @param httpRequest HttpServletRequest để tạo session
     * @return AuthUserResponse thông tin user sau khi login thành công
     * @throws AuthenticationException nếu credentials không hợp lệ
     */
    public AuthUserResponse login(LoginRequest request, HttpServletRequest httpRequest) throws AuthenticationException {
        log.info("Login attempt for user: {}", request.username());

        // Tạo authentication token từ username/password
        UsernamePasswordAuthenticationToken authenticationToken =
                new UsernamePasswordAuthenticationToken(request.username(), request.password());

        // Gọi AuthenticationManager để authenticate (kiểm tra credentials)
        Authentication authentication = authenticationManager.authenticate(authenticationToken);

        // Tạo SecurityContext mới và set authentication
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        // Tạo session HTTP và lưu SecurityContext vào session
        // changeSessionId() để bảo mật - tránh session fixation attack
        HttpSession session = httpRequest.getSession(true);
        httpRequest.changeSessionId();
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);

        AuthUserDetails principal = (AuthUserDetails) authentication.getPrincipal();
        log.info("User {} logged in successfully with role {}", principal.getUsername(), principal.getRole());
        return toResponse(principal);
    }

    /**
     * Xử lý đăng xuất người dùng
     * @param request HttpServletRequest
     * @param response HttpServletResponse
     */
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AuthUserDetails details) {
            log.info("User {} logging out", details.getUsername());
        }
        // Sử dụng SecurityContextLogoutHandler để clean up session và context
        new SecurityContextLogoutHandler().logout(request, response, authentication);
    }

    /**
     * Lấy thông tin user hiện tại từ SecurityContext
     * @param authentication Authentication object từ Spring Security
     * @return Optional chứa AuthUserResponse nếu user đã authenticated
     */
    public Optional<AuthUserResponse> getCurrentUser(Authentication authentication) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return Optional.empty();
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof AuthUserDetails userDetails) {
            return Optional.of(toResponse(userDetails));
        }

        return Optional.empty();
    }

    /**
     * Convert AuthUserDetails thành AuthUserResponse DTO
     * @param userDetails thông tin user từ authentication
     * @return AuthUserResponse để trả về client
     */
    private AuthUserResponse toResponse(AuthUserDetails userDetails) {
        DepartmentLiteDto department = null;
        if (userDetails.getDepartmentId() != null) {
            department = new DepartmentLiteDto(
                    userDetails.getDepartmentId(),
                    userDetails.getDepartmentCode(),
                    userDetails.getDepartmentName()
            );
        }

        return new AuthUserResponse(
                userDetails.getId(),
                userDetails.getUsername(),
                userDetails.getRole().name(),
                userDetails.isMustChangePassword(),
                department,
                userDetails.getDepartmentId()
        );
    }
}
