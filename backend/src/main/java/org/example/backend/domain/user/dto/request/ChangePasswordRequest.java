package org.example.backend.domain.user.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ChangePasswordRequest(
        @NotBlank(message = "Current password is required")
        String currentPassword,

        @NotBlank(message = "New password is required")
        @Pattern(
                regexp = PasswordRules.PASSWORD_REGEX,
                message = PasswordRules.PASSWORD_MESSAGE
        )
        String newPassword
) {
}
