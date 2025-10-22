package org.example.backend.domain.user.repository;

import org.example.backend.domain.user.entity.User;
import org.example.backend.domain.user.enums.UserRole;
import org.springframework.data.jpa.domain.Specification;

public final class UserSpecifications {

    private UserSpecifications() {
    }

    public static Specification<User> withFilters(
            String keyword,
            UserRole role,
            Long departmentId,
            Boolean active
    ) {
        return Specification
                .where(keywordLike(keyword))
                .and(roleEquals(role))
                .and(departmentEquals(departmentId))
                .and(activeEquals(active));
    }

    public static Specification<User> keywordLike(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }
        String pattern = "%" + keyword.trim().toLowerCase() + "%";
        return (root, query, builder) -> builder.or(
                builder.like(builder.lower(root.get("username")), pattern),
                builder.like(builder.lower(root.get("email")), pattern),
                builder.like(builder.lower(root.get("fullName")), pattern)
        );
    }

    public static Specification<User> roleEquals(UserRole role) {
        if (role == null) {
            return null;
        }
        return (root, query, builder) -> builder.equal(root.get("role"), role);
    }

    public static Specification<User> departmentEquals(Long departmentId) {
        if (departmentId == null) {
            return null;
        }
        return (root, query, builder) -> builder.equal(root.get("departmentId"), departmentId);
    }

    public static Specification<User> activeEquals(Boolean active) {
        if (active == null) {
            return null;
        }
        return (root, query, builder) -> builder.equal(root.get("active"), active);
    }
}
