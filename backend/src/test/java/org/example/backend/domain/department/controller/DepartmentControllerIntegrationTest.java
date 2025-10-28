package org.example.backend.domain.department.controller;

import org.example.backend.domain.auth.service.AuthUserDetails;
import org.example.backend.domain.department.entity.Department;
import org.example.backend.domain.user.entity.User;
import org.example.backend.domain.user.repository.DepartmentRepository;
import org.example.backend.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class DepartmentControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private UserRepository userRepository;

    private AuthUserDetails adminUser;
    private AuthUserDetails agentUser;

    @BeforeEach
    void setUp() {
        User admin = userRepository.findByUsername("admin").orElseThrow();
        User agent = userRepository.findByUsername("agent").orElseThrow();
        adminUser = AuthUserDetails.from(admin);
        agentUser = AuthUserDetails.from(agent);
    }

    @Test
    void createDepartment_requiresAdmin() throws Exception {
        String payload = """
                {
                  "code": "OPS",
                  "name": "Operations",
                  "description": "Ops team"
                }
                """;

        mockMvc.perform(post("/api/departments")
                        .with(user(agentUser))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden());
    }

    @Test
    void createDepartment_asAdmin_returnsCreated() throws Exception {
        String payload = """
                {
                  "code": "OPS",
                  "name": "Operations",
                  "description": "Operations team"
                }
                """;

        mockMvc.perform(post("/api/departments")
                        .with(user(adminUser))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("OPS"))
                .andExpect(jsonPath("$.active").value(true));

        assertThat(departmentRepository.findByCodeIgnoreCase("OPS")).isPresent();
    }

    @Test
    void updateDepartment_asAdmin_updatesRecord() throws Exception {
        Department department = departmentRepository.save(new Department("OPS", "Operations", "Ops team"));

        String payload = """
                {
                  "name": "Operations Hub",
                  "active": false
                }
                """;

        mockMvc.perform(patch("/api/departments/" + department.getId())
                        .with(user(adminUser))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Operations Hub"))
                .andExpect(jsonPath("$.active").value(false));
    }

    @Test
    void minimalEndpoint_accessibleToAnyAuthenticatedUser() throws Exception {
        mockMvc.perform(get("/api/departments/minimal")
                        .with(user(agentUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].code").value(org.hamcrest.Matchers.hasItem("IT")));
    }
}
