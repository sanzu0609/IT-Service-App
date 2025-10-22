package org.example.backend.domain.user.dto.response;

import java.time.LocalDateTime;

public record UserDetailResponse(
        Long id,
        String username,
        String email,
        String fullName,
        String role,
        Long departmentId,
        boolean isActive,
        boolean mustChangePassword,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
