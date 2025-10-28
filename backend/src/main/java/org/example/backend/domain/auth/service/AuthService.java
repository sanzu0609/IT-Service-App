package org.example.backend.domain.auth.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.util.Optional;
import org.example.backend.domain.auth.dto.request.LoginRequest;
import org.example.backend.domain.auth.dto.response.AuthUserResponse;
import org.example.backend.domain.department.dto.DepartmentLiteDto;
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

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;

    public AuthService(AuthenticationManager authenticationManager) {
        this.authenticationManager = authenticationManager;
    }

    public AuthUserResponse login(LoginRequest request, HttpServletRequest httpRequest) throws AuthenticationException {
        UsernamePasswordAuthenticationToken authenticationToken =
                new UsernamePasswordAuthenticationToken(request.username(), request.password());

        Authentication authentication = authenticationManager.authenticate(authenticationToken);

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        HttpSession session = httpRequest.getSession(true);
        httpRequest.changeSessionId();
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);

        AuthUserDetails principal = (AuthUserDetails) authentication.getPrincipal();
        return toResponse(principal);
    }

    public void logout(HttpServletRequest request, HttpServletResponse response) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        new SecurityContextLogoutHandler().logout(request, response, authentication);
    }

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
