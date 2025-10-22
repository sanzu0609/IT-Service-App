package org.example.backend.domain.user.dto.request;

final class PasswordRules {

    private PasswordRules() {
    }

    static final String PASSWORD_REGEX = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[\\W_]).{8,64}$";
    static final String PASSWORD_MESSAGE =
            "Password must be 8-64 characters and include upper, lower, digit, and special character";
}
