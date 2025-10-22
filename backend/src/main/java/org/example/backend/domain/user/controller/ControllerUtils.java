package org.example.backend.domain.user.controller;

import org.example.backend.domain.auth.service.AuthUserDetails;
import org.springframework.security.core.Authentication;

final class ControllerUtils {

    private ControllerUtils() {
    }

    static AuthUserDetails requirePrincipal(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthUserDetails details)) {
            throw new IllegalStateException("Authentication principal is missing or invalid.");
        }
        return details;
    }
}
