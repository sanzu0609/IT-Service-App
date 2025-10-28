package org.example.backend.domain.user.service;

import java.util.Optional;
import org.example.backend.domain.user.dto.request.ChangePasswordRequest;
import org.example.backend.domain.user.entity.User;
import org.example.backend.domain.user.enums.UserRole;
import org.example.backend.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.verify;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class UserSelfServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserSelfService userSelfService;

    private User existing;

    @BeforeEach
    void setUp() {
        existing = new User("alice", "alice@example.com", "hash", "Alice", UserRole.END_USER, null);
        ReflectionTestUtils.setField(existing, "id", 3L);
    }

    @Test
    void changePassword_shouldThrowWhenUserNotFound() {
        given(userRepository.findById(anyLong())).willReturn(Optional.empty());

        assertThatThrownBy(() -> userSelfService.changePassword(3L, new ChangePasswordRequest("Old@123", "New@1234")))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void changePassword_shouldThrowWhenCurrentPasswordInvalid() {
        given(userRepository.findById(3L)).willReturn(Optional.of(existing));
        given(passwordEncoder.matches("Old@123", "hash")).willReturn(false);

        assertThatThrownBy(() -> userSelfService.changePassword(3L, new ChangePasswordRequest("Old@123", "New@1234")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Current password is incorrect");
    }

    @Test
    void changePassword_shouldUpdatePassword() {
        given(userRepository.findById(3L)).willReturn(Optional.of(existing));
        given(passwordEncoder.matches("Old@123", "hash")).willReturn(true);
        given(passwordEncoder.encode("New@1234")).willReturn("encoded");

        userSelfService.changePassword(3L, new ChangePasswordRequest("Old@123", "New@1234"));

        verify(passwordEncoder).encode("New@1234");
        assertThat(existing.getPasswordHash()).isEqualTo("encoded");
        assertThat(existing.isMustChangePassword()).isFalse();
    }
}
