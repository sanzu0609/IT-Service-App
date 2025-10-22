package org.example.backend.domain.user.service;

import jakarta.persistence.EntityNotFoundException;
import java.util.Optional;
import org.example.backend.domain.user.dto.request.CreateUserRequest;
import org.example.backend.domain.user.dto.request.ResetPasswordRequest;
import org.example.backend.domain.user.dto.request.UpdateUserRequest;
import org.example.backend.domain.user.dto.response.UserSummaryResponse;
import org.example.backend.domain.user.entity.User;
import org.example.backend.domain.user.enums.UserRole;
import org.example.backend.domain.user.repository.DepartmentRepository;
import org.example.backend.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class UserAdminServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserAdminService userAdminService;

    private CreateUserRequest createRequest;

    @BeforeEach
    void setUp() {
        createRequest = new CreateUserRequest(
                "bob",
                "bob@example.com",
                "Bob Marley",
                UserRole.AGENT,
                1L,
                "Temp@123"
        );
    }

    @Test
    void createUser_shouldThrowWhenUsernameExists() {
        given(userRepository.existsByUsername("bob")).willReturn(true);

        assertThatThrownBy(() -> userAdminService.createUser(createRequest))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Username already exists");

        verify(userRepository, never()).save(any());
    }

    @Test
    void createUser_shouldThrowWhenEmailExists() {
        given(userRepository.existsByUsername("bob")).willReturn(false);
        given(userRepository.existsByEmail("bob@example.com")).willReturn(true);

        assertThatThrownBy(() -> userAdminService.createUser(createRequest))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Email already exists");

        verify(userRepository, never()).save(any());
    }

    @Test
    void createUser_shouldPersistWhenValid() {
        given(userRepository.existsByUsername("bob")).willReturn(false);
        given(userRepository.existsByEmail("bob@example.com")).willReturn(false);
        given(departmentRepository.existsById(1L)).willReturn(true);
        given(passwordEncoder.encode("Temp@123")).willReturn("encoded");
        given(userRepository.save(any(User.class))).willAnswer(invocation -> {
            User user = invocation.getArgument(0);
            ReflectionTestUtils.setField(user, "id", 99L);
            return user;
        });

        UserSummaryResponse response = userAdminService.createUser(createRequest);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertThat(saved.getUsername()).isEqualTo("bob");
        assertThat(saved.isMustChangePassword()).isTrue();
        assertThat(saved.isActive()).isTrue();
        assertThat(response.id()).isEqualTo(99L);
        assertThat(response.mustChangePassword()).isTrue();
    }

    @Test
    void updateUser_shouldThrowWhenDeactivatingSelf() {
        User existing = buildUser(1L, UserRole.AGENT, true);
        given(userRepository.findById(1L)).willReturn(Optional.of(existing));

        UpdateUserRequest request = new UpdateUserRequest(
                null,
                null,
                null,
                null,
                null,
                false
        );

        assertThatThrownBy(() -> userAdminService.updateUser(1L, request, 1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("deactivate your own account");
    }

    @Test
    void updateUser_shouldThrowWhenModifyingLastAdmin() {
        User existing = buildUser(10L, UserRole.ADMIN, true);
        given(userRepository.findById(10L)).willReturn(Optional.of(existing));
        given(userRepository.countByRole(UserRole.ADMIN)).willReturn(1L);

        UpdateUserRequest request = new UpdateUserRequest(
                null,
                null,
                null,
                UserRole.AGENT,
                null,
                null
        );

        assertThatThrownBy(() -> userAdminService.updateUser(10L, request, 99L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot modify the last ADMIN user");
    }

    @Test
    void resetPassword_shouldSetMustChangePassword() {
        User existing = buildUser(5L, UserRole.AGENT, true);
        given(userRepository.findById(5L)).willReturn(Optional.of(existing));
        given(passwordEncoder.encode(anyString())).willReturn("encoded");

        UserSummaryResponse response = userAdminService.resetPassword(5L, new ResetPasswordRequest("NewPass@123"));

        assertThat(existing.isMustChangePassword()).isTrue();
        assertThat(response.mustChangePassword()).isTrue();
    }

    @Test
    void updateUser_shouldThrowWhenDepartmentNotFound() {
        User existing = buildUser(2L, UserRole.AGENT, true);
        given(userRepository.findById(2L)).willReturn(Optional.of(existing));
        given(departmentRepository.existsById(999L)).willReturn(false);

        UpdateUserRequest request = new UpdateUserRequest(
                null,
                null,
                null,
                null,
                999L,
                null
        );

        assertThatThrownBy(() -> userAdminService.updateUser(2L, request, 99L))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("Department not found");
    }

    private User buildUser(Long id, UserRole role, boolean active) {
        User user = new User("user" + id, "user" + id + "@example.com", "hash", "User " + id, role, 1L);
        user.setActive(active);
        user.setMustChangePassword(false);
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }
}
