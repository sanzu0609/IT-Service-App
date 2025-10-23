package org.example.backend.domain.ticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.example.backend.domain.auth.service.AuthUserDetails;
import org.example.backend.domain.ticket.entity.Category;
import org.example.backend.domain.ticket.entity.Ticket;
import org.example.backend.domain.ticket.enums.TicketPriority;
import org.example.backend.domain.ticket.enums.TicketStatus;
import org.example.backend.domain.ticket.repository.CategoryRepository;
import org.example.backend.domain.ticket.repository.TicketRepository;
import org.example.backend.domain.user.entity.User;
import org.example.backend.domain.user.enums.UserRole;
import org.example.backend.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class TicketServiceTest {

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TicketNumberGenerator ticketNumberGenerator;

    @Mock
    private WorkflowValidator workflowValidator;

    @Mock
    private TicketHistoryService ticketHistoryService;

    @Mock
    private SlaService slaService;

    @InjectMocks
    private TicketService ticketService;

    private AuthUserDetails endUser;
    private AuthUserDetails admin;

    @BeforeEach
    void setUp() {
        endUser = authPrincipal(1L, UserRole.END_USER);
        admin = authPrincipal(2L, UserRole.ADMIN);
    }

    @Test
    void createTicket_initializesSla() {
        CreateTicketCommand command = new CreateTicketCommand("subject", "description long", TicketPriority.HIGH, 1L, null);
        User reporter = user(1L, UserRole.END_USER);
        Category category = new Category("Hardware", null);
        given(userRepository.findById(1L)).willReturn(Optional.of(reporter));
        given(categoryRepository.findById(1L)).willReturn(Optional.of(category));
        given(ticketNumberGenerator.nextTicketNumber()).willReturn("ITSM-2025-0001");
        given(ticketRepository.save(any(Ticket.class))).willAnswer(inv -> inv.getArgument(0));

        Ticket saved = ticketService.createTicket(command, endUser);

        assertThat(saved.getTicketNumber()).isNotNull();
        verify(ticketNumberGenerator).nextTicketNumber();
        verify(slaService).initializeSla(any(Ticket.class), any(LocalDateTime.class));
    }

    @Test
    void updateTicket_priorityChangeRecalculatesSla() {
        Ticket ticket = sampleTicket();
        given(ticketRepository.findById(10L)).willReturn(Optional.of(ticket));
        given(ticketRepository.save(ticket)).willReturn(ticket);

        ticketService.updateTicket(10L, new UpdateTicketCommand(null, TicketPriority.CRITICAL, null, false, null), admin);

        verify(slaService).applyDeadlines(eq(ticket), any(LocalDateTime.class));
        verify(slaService).evaluateFlag(eq(ticket), any(LocalDateTime.class));
    }

    @Test
    void changeStatus_resolvedSetsResolvedAtAndHistory() {
        Ticket ticket = sampleTicket();
        given(ticketRepository.findById(10L)).willReturn(Optional.of(ticket));
        given(ticketRepository.save(ticket)).willReturn(ticket);
        given(userRepository.findById(2L)).willReturn(Optional.of(ticket.getReporter()));

        ticketService.changeStatus(10L, new TicketStatusChangeCommand(TicketStatus.RESOLVED, "done"), admin);

        assertThat(ticket.getResolvedAt()).isNotNull();
        verify(ticketHistoryService).recordStatusChange(eq(ticket), eq(TicketStatus.NEW), eq(TicketStatus.RESOLVED), any(User.class), eq("done"));
    }

    @Test
    void autoCloseResolvedTickets_marksClosedAndHistory() {
        Ticket ticket = sampleTicket();
        ticket.setStatus(TicketStatus.RESOLVED);
        ticket.setResolvedAt(LocalDateTime.now().minusDays(10));
        given(ticketRepository.findByStatusAndResolvedAtBefore(any(), any())).willReturn(List.of(ticket));
        given(ticketRepository.save(ticket)).willReturn(ticket);

        int closed = ticketService.autoCloseResolvedTickets(LocalDateTime.now().minusDays(7), "Auto closed by system");

        assertThat(closed).isEqualTo(1);
        assertThat(ticket.getStatus()).isEqualTo(TicketStatus.CLOSED);
        verify(ticketHistoryService).recordStatusChange(eq(ticket), eq(TicketStatus.RESOLVED), eq(TicketStatus.CLOSED), any(User.class), eq("Auto closed by system"));
    }

    private Ticket sampleTicket() {
        Category category = new Category("Hardware", null);
        User reporter = user(2L, UserRole.ADMIN);
        Ticket ticket = new Ticket("subject", "description long", TicketPriority.HIGH, category, reporter);
        ReflectionTestUtils.setField(ticket, "id", 10L);
        return ticket;
    }

    private User user(Long id, UserRole role) {
        User user = new User("user" + id, "mail" + id + "@example.com", "pwd", "User" + id, role, null);
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }

    private AuthUserDetails authPrincipal(Long id, UserRole role) {
        User user = user(id, role);
        return AuthUserDetails.from(user);
    }
}
