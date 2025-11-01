package org.example.backend.domain.user.dto.response;

import java.time.LocalDateTime;
import org.example.backend.domain.department.dto.DepartmentLiteDto;

public record UserDetailResponse(
        Long id,
        String username,
        String email,
        String fullName,
        String role,
        DepartmentLiteDto department,
        Long departmentId,
        boolean active,
        boolean mustChangePassword,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
