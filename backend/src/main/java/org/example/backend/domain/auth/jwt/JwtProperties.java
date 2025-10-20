package org.example.backend.domain.auth.jwt;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

/**
 * Configuration binding for JWT settings that are provided via environment variables.
 */
@Component
@Validated
@ConfigurationProperties(prefix = "app.jwt")
public class JwtProperties {

    @NotBlank
    private String secret;

    @Positive
    private long expirationMinutes;

    @Positive
    private long refreshExpirationDays;

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public long getExpirationMinutes() {
        return expirationMinutes;
    }

    public void setExpirationMinutes(long expirationMinutes) {
        this.expirationMinutes = expirationMinutes;
    }

    public long getRefreshExpirationDays() {
        return refreshExpirationDays;
    }

    public void setRefreshExpirationDays(long refreshExpirationDays) {
        this.refreshExpirationDays = refreshExpirationDays;
    }
}
