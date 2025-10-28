package org.example.backend.domain.department.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateDepartmentRequest(
        @NotBlank(message = "Code is required")
        @Pattern(
                regexp = "^[A-Za-z0-9_-]{2,32}$",
                message = "Code must be 2-32 characters (letters, numbers, underscore, hyphen)"
        )
        String code,

        @NotBlank(message = "Name is required")
        @Size(min = 2, max = 128, message = "Name must be between 2 and 128 characters")
        String name,

        @Size(max = 512, message = "Description must not exceed 512 characters")
        String description,

        Boolean active
) {
}
