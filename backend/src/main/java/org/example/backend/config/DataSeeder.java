package org.example.backend.config;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.example.backend.domain.department.entity.Department;
import org.example.backend.domain.ticket.entity.Category;
import org.example.backend.domain.ticket.repository.CategoryRepository;
import org.example.backend.domain.user.entity.User;
import org.example.backend.domain.user.enums.UserRole;
import org.example.backend.domain.user.repository.DepartmentRepository;
import org.example.backend.domain.user.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private final DepartmentRepository departmentRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(
            DepartmentRepository departmentRepository,
            CategoryRepository categoryRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.departmentRepository = departmentRepository;
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        Map<String, Department> departments = seedDepartments();
        seedCategories();
        seedUsers(departments);
    }

    private Map<String, Department> seedDepartments() {
        Map<String, Department> results = new LinkedHashMap<>();
        Map<String, String> departments = Map.of(
                "IT", "Information Technology",
                "HR", "Human Resources"
        );

        departments.forEach((code, name) -> {
            Department department = departmentRepository.findByCodeIgnoreCase(code)
                    .orElseGet(() -> departmentRepository.save(
                            new Department(code, name, name + " team")
                    ));
            results.put(code, department);
        });

        return results;
    }

    private void seedCategories() {
        List<String> categories = List.of("Hardware", "Software", "Access");

        for (String name : categories) {
            categoryRepository.findByName(name)
                    .orElseGet(() -> categoryRepository.save(new Category(name, null)));
        }
    }

    private void seedUsers(Map<String, Department> departments) {
        createUserIfAbsent(
                "admin",
                "admin@example.com",
                "Admin User",
                "Admin@123",
                UserRole.ADMIN,
                departments.get("IT")
        );

        createUserIfAbsent(
                "agent",
                "agent@example.com",
                "Agent Smith",
                "Agent@123",
                UserRole.AGENT,
                departments.get("IT")
        );

        createUserIfAbsent(
                "alice",
                "alice@example.com",
                "Alice Johnson",
                "Alice@123",
                UserRole.END_USER,
                departments.get("HR")
        );
    }

    private void createUserIfAbsent(
            String username,
            String email,
            String fullName,
            String rawPassword,
            UserRole role,
            Department department
    ) {
        if (department == null
                || userRepository.existsByUsername(username)
                || userRepository.existsByEmail(email)) {
            return;
        }

        String encodedPassword = passwordEncoder.encode(rawPassword);
        User user = new User(username, email, encodedPassword, fullName, role, department);
        user.setMustChangePassword(false);
        user.setActive(true);
        userRepository.save(user);
    }
}
