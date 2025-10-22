package org.example.backend.domain.user.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;
import org.example.backend.domain.user.dto.request.CreateUserRequest;
import org.example.backend.domain.user.dto.request.ResetPasswordRequest;
import org.example.backend.domain.user.dto.request.UpdateUserRequest;
import org.example.backend.domain.user.dto.response.UserDetailResponse;
import org.example.backend.domain.user.dto.response.UserSummaryResponse;
import org.example.backend.domain.user.entity.User;
import org.example.backend.domain.user.enums.UserRole;
import org.example.backend.domain.user.repository.DepartmentRepository;
import org.example.backend.domain.user.repository.UserRepository;
import org.example.backend.domain.user.repository.UserSpecifications;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserAdminService {

    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;

    public UserAdminService(
            UserRepository userRepository,
            DepartmentRepository departmentRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.departmentRepository = departmentRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UserSummaryResponse createUser(CreateUserRequest request) {
        validateUsernameUniqueness(request.username());
        validateEmailUniqueness(request.email());

        User user = new User(
                request.username(),
                request.email(),
                encodePassword(resolveTempPassword(request.tempPassword())),
                request.fullName(),
                request.role(),
                resolveDepartmentId(request.departmentId())
        );
        user.setMustChangePassword(true);
        user.setActive(true);

        User saved = userRepository.save(user);
        return toSummary(saved);
    }

    @Transactional
    public UserDetailResponse updateUser(Long userId, UpdateUserRequest request, Long actingUserId) {
        User user = findUserOrThrow(userId);

        if (request.isActive() != null && !request.isActive() && userId.equals(actingUserId)) {
            throw new IllegalStateException("You cannot deactivate your own account.");
        }

        if (request.role() != null && request.role() != user.getRole()) {
            guardLastAdmin(user);
            user.setRole(request.role());
        }

        if (request.isActive() != null) {
            if (!request.isActive()) {
                guardLastAdmin(user);
            }
            user.setActive(request.isActive());
        }

        if (request.fullName() != null && !request.fullName().isBlank()) {
            user.setFullName(request.fullName().trim());
        }

        if (request.departmentId() != null) {
            user.setDepartmentId(resolveDepartmentId(request.departmentId()));
        }

        if (request.username() != null && !request.username().isBlank()) {
            validateUsernameChange(user, request.username());
            user.setUsername(request.username().trim());
        }

        if (request.email() != null && !request.email().isBlank()) {
            validateEmailChange(user, request.email());
            user.setEmail(request.email().trim());
        }

        return toDetail(user);
    }

    @Transactional
    public UserSummaryResponse resetPassword(Long userId, ResetPasswordRequest request) {
        User user = findUserOrThrow(userId);
        String rawPassword = Optional.ofNullable(request.tempPassword())
                .filter(password -> !password.isBlank())
                .orElseGet(RandomPasswordGenerator::generate);

        user.setPasswordHash(encodePassword(rawPassword));
        user.setMustChangePassword(true);
        return toSummary(user);
    }

    @Transactional
    public void deactivateUser(Long userId, Long actingUserId) {
        User user = findUserOrThrow(userId);
        if (userId.equals(actingUserId)) {
            throw new IllegalStateException("You cannot deactivate your own account.");
        }
        guardLastAdmin(user);
        user.setActive(false);
    }

    @Transactional
    public void reactivateUser(Long userId) {
        User user = findUserOrThrow(userId);
        user.setActive(true);
    }

    @Transactional
    public void deleteUser(Long userId) {
        User user = findUserOrThrow(userId);
        guardLastAdmin(user);
        userRepository.delete(user);
    }

    @Transactional(readOnly = true)
    public UserDetailResponse getUser(Long userId) {
        return toDetail(findUserOrThrow(userId));
    }

    @Transactional(readOnly = true)
    public Page<UserSummaryResponse> listUsers(
            String keyword,
            UserRole role,
            Long departmentId,
            Boolean active,
            Pageable pageable
    ) {
        return userRepository.findAll(
                UserSpecifications.withFilters(keyword, role, departmentId, active),
                pageable
        ).map(this::toSummary);
    }

    private void validateUsernameUniqueness(String username) {
        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("Username already exists.");
        }
    }

    private void validateEmailUniqueness(String email) {
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already exists.");
        }
    }

    private void guardLastAdmin(User user) {
        if (user.getRole() == UserRole.ADMIN && userRepository.countByRole(UserRole.ADMIN) <= 1) {
            throw new IllegalStateException("Cannot modify the last ADMIN user.");
        }
    }

    private void validateUsernameChange(User user, String newUsername) {
        String trimmed = newUsername.trim();
        if (!trimmed.equals(user.getUsername()) && userRepository.existsByUsername(trimmed)) {
            throw new IllegalArgumentException("Username already exists.");
        }
    }

    private void validateEmailChange(User user, String newEmail) {
        String trimmed = newEmail.trim();
        if (!trimmed.equalsIgnoreCase(user.getEmail()) && userRepository.existsByEmail(trimmed)) {
            throw new IllegalArgumentException("Email already exists.");
        }
    }

    private User findUserOrThrow(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found with id: " + id));
    }

    private String encodePassword(String raw) {
        return passwordEncoder.encode(raw);
    }

    private String resolveTempPassword(String tempPassword) {
        if (tempPassword == null || tempPassword.isBlank()) {
            return RandomPasswordGenerator.generate();
        }
        return tempPassword;
    }

    private Long resolveDepartmentId(Long departmentId) {
        if (departmentId == null) {
            return null;
        }
        if (!departmentRepository.existsById(departmentId)) {
            throw new EntityNotFoundException("Department not found with id: " + departmentId);
        }
        return departmentId;
    }

    private UserSummaryResponse toSummary(User user) {
        return new UserSummaryResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getRole().name(),
                user.getDepartmentId(),
                user.isActive(),
                user.isMustChangePassword()
        );
    }

    private UserDetailResponse toDetail(User user) {
        return new UserDetailResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getRole().name(),
                user.getDepartmentId(),
                user.isActive(),
                user.isMustChangePassword(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
