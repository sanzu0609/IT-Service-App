package org.example.backend.domain.user.repository;

import org.example.backend.domain.department.entity.Department;
import org.springframework.data.jpa.domain.Specification;

public final class DepartmentSpecifications {

    private DepartmentSpecifications() {
    }

    public static Specification<Department> withFilters(String keyword, Boolean active) {
        return Specification
                .where(keywordLike(keyword))
                .and(activeEquals(active));
    }

    private static Specification<Department> keywordLike(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }
        String pattern = "%" + keyword.trim().toLowerCase() + "%";
        return (root, query, builder) -> builder.or(
                builder.like(builder.lower(root.get("code")), pattern),
                builder.like(builder.lower(root.get("name")), pattern)
        );
    }

    private static Specification<Department> activeEquals(Boolean active) {
        if (active == null) {
            return null;
        }
        return (root, query, builder) -> builder.equal(root.get("active"), active);
    }
}
