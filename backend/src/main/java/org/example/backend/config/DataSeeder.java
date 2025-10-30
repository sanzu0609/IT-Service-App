package org.example.backend.config;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.example.backend.domain.department.entity.Department;
import org.example.backend.domain.ticket.entity.Ticket;
import org.example.backend.domain.ticket.enums.TicketCategory;
import org.example.backend.domain.ticket.enums.TicketPriority;
import org.example.backend.domain.ticket.enums.TicketStatus;
import org.example.backend.domain.ticket.repository.TicketRepository;
import org.example.backend.domain.ticket.service.SlaService;
import org.example.backend.domain.ticket.service.TicketNumberGenerator;
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
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TicketRepository ticketRepository;
    private final TicketNumberGenerator ticketNumberGenerator;
    private final SlaService slaService;

    public DataSeeder(
            DepartmentRepository departmentRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            TicketRepository ticketRepository,
            TicketNumberGenerator ticketNumberGenerator,
            SlaService slaService
    ) {
        this.departmentRepository = departmentRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.ticketRepository = ticketRepository;
        this.ticketNumberGenerator = ticketNumberGenerator;
        this.slaService = slaService;
    }

    @Override
    public void run(String... args) {
        Map<String, Department> departments = seedDepartments();
        seedUsers(departments);
        seedTickets();
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

    private void seedTickets() {
        if (ticketRepository.count() > 0) {
            return;
        }

        Optional<User> optionalReporter = userRepository.findByUsername("alice");
        Optional<User> optionalAgent = userRepository.findByUsername("agent");
        Optional<User> optionalAdmin = userRepository.findByUsername("admin");

        if (optionalReporter.isEmpty() && optionalAdmin.isEmpty()) {
            return;
        }

        User reporter = optionalReporter.orElseGet(optionalAdmin::orElseThrow);
        User agent = optionalAgent.orElse(null);
        User admin = optionalAdmin.orElse(null);
        LocalDateTime now = LocalDateTime.now();

        Ticket vpnIssue = new Ticket(
                "Cannot access corporate VPN",
                "VPN client keeps timing out when connecting from home network.",
                TicketPriority.HIGH,
                TicketCategory.NETWORK,
                reporter
        );
        vpnIssue.setTicketNumber(ticketNumberGenerator.nextTicketNumber());
        vpnIssue.setStatus(TicketStatus.IN_PROGRESS);
        vpnIssue.setRelatedAssetId(4102L);
        if (agent != null) {
            vpnIssue.setAssignee(agent);
        }
        slaService.initializeSla(vpnIssue, now.minusHours(4));

        Ticket hardwareIssue = new Ticket(
                "Laptop screen flickers intermittently",
                "Screen starts flickering whenever HDMI cable is plugged in.",
                TicketPriority.MEDIUM,
                TicketCategory.HARDWARE,
                reporter
        );
        hardwareIssue.setTicketNumber(ticketNumberGenerator.nextTicketNumber());
        hardwareIssue.setStatus(TicketStatus.NEW);
        hardwareIssue.setRelatedAssetId(5120L);
        slaService.initializeSla(hardwareIssue, now.minusHours(1));

        Ticket onboardingRequest = new Ticket(
                "Onboard contractor email access",
                "Need temporary email and VPN access for contractor for the next 30 days.",
                TicketPriority.LOW,
                TicketCategory.ACCESS,
                admin != null ? admin : reporter
        );
        onboardingRequest.setTicketNumber(ticketNumberGenerator.nextTicketNumber());
        onboardingRequest.setStatus(TicketStatus.RESOLVED);
        onboardingRequest.setResolvedAt(now.minusHours(6));
        if (agent != null) {
            onboardingRequest.setAssignee(agent);
        }
        slaService.initializeSla(onboardingRequest, now.minusHours(12));

        ticketRepository.saveAll(List.of(vpnIssue, hardwareIssue, onboardingRequest));
    }
}
