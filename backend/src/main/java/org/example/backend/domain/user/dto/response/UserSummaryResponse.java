package org.example.backend.domain.user.dto.response;

import org.example.backend.domain.department.dto.DepartmentLiteDto;

public record UserSummaryResponse(
        Long id,
        String username,
        String email,
        String fullName,
        String role,
        DepartmentLiteDto department,
        Long departmentId,
        boolean active,
        boolean mustChangePassword
) {
}
