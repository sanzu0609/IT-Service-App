package org.example.backend.domain.user.dto.request;

import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.example.backend.domain.user.enums.UserRole;

public record UpdateUserRequest(
        @Size(max = 100, message = "Full name must not exceed 100 characters")
        String fullName,

        UserRole role,

        @Positive(message = "Department id must be positive")
        Long departmentId,

        Boolean isActive
) {
}
