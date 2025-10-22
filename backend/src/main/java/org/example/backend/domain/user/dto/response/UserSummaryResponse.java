package org.example.backend.domain.user.dto.response;

public record UserSummaryResponse(
        Long id,
        String username,
        String email,
        String fullName,
        String role,
        Long departmentId,
        boolean isActive,
        boolean mustChangePassword
) {
}
