package org.example.backend.domain.user.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.backend.domain.auth.service.AuthUserDetails;
import org.example.backend.domain.user.dto.request.ChangePasswordRequest;
import org.example.backend.domain.user.dto.request.CreateUserRequest;
import org.example.backend.domain.user.dto.request.ResetPasswordRequest;
import org.example.backend.domain.user.entity.User;
import org.example.backend.domain.user.enums.UserRole;
import org.example.backend.domain.user.repository.DepartmentRepository;
import org.example.backend.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class UserControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Long itDepartmentId;

    @BeforeEach
    void setUp() {
        itDepartmentId = departmentRepository.findAll().stream()
                .filter(dept -> "IT".equals(dept.getName()))
                .map(dept -> dept.getId())
                .findFirst()
                .orElseThrow();
    }

    @Test
    void createUser_asAdmin_returnsCreated() throws Exception {
        CreateUserRequest request = new CreateUserRequest(
                "charlie",
                "charlie@example.com",
                "Charlie Brown",
                UserRole.AGENT,
                itDepartmentId,
                "Temp@2025"
        );

        mockMvc.perform(post("/api/users")
                        .with(SecurityMockMvcRequestPostProcessors.user(authUser("admin")))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("charlie"))
                .andExpect(jsonPath("$.mustChangePassword").value(true));

        assertThat(userRepository.existsByUsername("charlie")).isTrue();
    }

    @Test
    void listUsers_forbiddenForNonAdmin() throws Exception {
        mockMvc.perform(get("/api/users")
                        .with(SecurityMockMvcRequestPostProcessors.user(authUser("agent"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void changePassword_requiresCsrfToken() throws Exception {
        ensureUserExists("selfuser", "Self@123");

        ChangePasswordRequest request = new ChangePasswordRequest("Self@123", "Self@456");

        mockMvc.perform(post("/api/users/change-password")
                        .with(SecurityMockMvcRequestPostProcessors.user(authUser("selfuser")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    void changePassword_successfullyUpdatesPassword() throws Exception {
        ensureUserExists("selfchange", "Self@123");

        ChangePasswordRequest request = new ChangePasswordRequest("Self@123", "Self@456");

        mockMvc.perform(post("/api/users/change-password")
                        .with(SecurityMockMvcRequestPostProcessors.user(authUser("selfchange")))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        User user = userRepository.findByUsername("selfchange").orElseThrow();
        assertThat(passwordEncoder.matches("Self@456", user.getPasswordHash())).isTrue();
        assertThat(user.isMustChangePassword()).isFalse();
    }

    @Test
    void resetPassword_returnsSummary() throws Exception {
        User target = ensureUserExists("targetuser", "Target@123");

        ResetPasswordRequest request = new ResetPasswordRequest("Target@456");

        mockMvc.perform(post("/api/users/" + target.getId() + "/reset-password")
                        .with(SecurityMockMvcRequestPostProcessors.user(authUser("admin")))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mustChangePassword").value(true));
    }

    @Test
    void updateUser_preventDeactivatingSelf() throws Exception {
        User admin = userRepository.findByUsername("admin").orElseThrow();

        String payload = objectMapper.writeValueAsString(new UpdateUserPayload(null, null, null, null, false));

        mockMvc.perform(patch("/api/users/" + admin.getId())
                        .with(SecurityMockMvcRequestPostProcessors.user(AuthUserDetails.from(admin)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"));
    }

    private AuthUserDetails authUser(String username) {
        User user = userRepository.findByUsername(username).orElseThrow();
        return AuthUserDetails.from(user);
    }

    private User ensureUserExists(String username, String rawPassword) {
        return userRepository.findByUsername(username)
                .orElseGet(() -> {
                    var department = departmentRepository.findById(itDepartmentId).orElseThrow();
                    User user = new User(
                            username,
                            username + "@example.com",
                            passwordEncoder.encode(rawPassword),
                            username,
                            UserRole.END_USER,
                            department
                    );
                    user.setMustChangePassword(true);
                    return userRepository.save(user);
                });
    }

    private record UpdateUserPayload(
            String username,
            String email,
            String fullName,
            UserRole role,
            Boolean isActive
    ) {
    }
}
