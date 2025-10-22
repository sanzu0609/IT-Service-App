package org.example.backend.domain.user.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.example.backend.domain.user.enums.UserRole;

public record CreateUserRequest(
        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
        String username,

        @NotBlank(message = "Email is required")
        @Email(message = "Email must be valid")
        String email,

        @NotBlank(message = "Full name is required")
        @Size(max = 100, message = "Full name must not exceed 100 characters")
        String fullName,

        @NotNull(message = "Role is required")
        UserRole role,

        @Positive(message = "Department id must be positive")
        Long departmentId,

        @Pattern(
                regexp = PasswordRules.PASSWORD_REGEX,
                message = PasswordRules.PASSWORD_MESSAGE
        )
        String tempPassword
) {
}
