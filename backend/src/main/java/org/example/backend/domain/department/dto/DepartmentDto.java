package org.example.backend.domain.department.dto;

import java.time.Instant;

public record DepartmentDto(
        Long id,
        String code,
        String name,
        String description,
        Boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}
