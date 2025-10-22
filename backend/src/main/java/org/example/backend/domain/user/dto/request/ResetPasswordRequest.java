package org.example.backend.domain.user.dto.request;

import jakarta.validation.constraints.Pattern;

public record ResetPasswordRequest(
        @Pattern(
                regexp = PasswordRules.PASSWORD_REGEX,
                message = PasswordRules.PASSWORD_MESSAGE
        )
        String tempPassword
) {
}
