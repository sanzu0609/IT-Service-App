package org.example.backend.domain.auth.dto.response;

public record AuthUserResponse(
        Long id,
        String username,
        String role,
        boolean mustChangePassword
) {
}
