package org.example.backend.domain.auth.controller;

import org.example.backend.domain.auth.service.AuthUserDetails;
import org.springframework.security.core.Authentication;

public final class AuthControllerUtils {

    private AuthControllerUtils() {
    }

    public static AuthUserDetails requirePrincipal(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthUserDetails details)) {
            throw new IllegalStateException("Authentication principal is missing or invalid");
        }
        return details;
    }
}
