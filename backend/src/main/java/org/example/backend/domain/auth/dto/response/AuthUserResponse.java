package org.example.backend.domain.auth.dto.response;

import org.example.backend.domain.department.dto.DepartmentLiteDto;

public record AuthUserResponse(
        Long id,
        String username,
        String role,
        boolean mustChangePassword,
        DepartmentLiteDto department,
        Long departmentId
) {
}
