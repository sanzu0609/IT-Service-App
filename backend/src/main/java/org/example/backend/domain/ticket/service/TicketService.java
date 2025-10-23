
package org.example.backend.domain.ticket.service;

import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import org.example.backend.domain.auth.service.AuthUserDetails;
import org.example.backend.domain.ticket.entity.Category;
import org.example.backend.domain.ticket.entity.Ticket;
import org.example.backend.domain.ticket.enums.TicketPriority;
import org.example.backend.domain.ticket.enums.TicketSlaFlag;
import org.example.backend.domain.ticket.enums.TicketStatus;
import org.example.backend.domain.ticket.repository.CategoryRepository;
import org.example.backend.domain.ticket.repository.TicketRepository;
import org.example.backend.domain.ticket.repository.TicketSpecifications;
import org.example.backend.domain.user.entity.User;
import org.example.backend.domain.user.enums.UserRole;
import org.example.backend.domain.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@Transactional
public class TicketService {

    private static final EnumSet<TicketStatus> ACTIVE_STATUSES = EnumSet.of(
            TicketStatus.NEW,
            TicketStatus.IN_PROGRESS,
            TicketStatus.ON_HOLD,
            TicketStatus.REOPENED,
            TicketStatus.RESOLVED
    );

    private final TicketRepository ticketRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final TicketNumberGenerator ticketNumberGenerator;
    private final WorkflowValidator workflowValidator;
    private final TicketHistoryService ticketHistoryService;
    private final SlaService slaService;

    public TicketService(
            TicketRepository ticketRepository,
            CategoryRepository categoryRepository,
            UserRepository userRepository,
            TicketNumberGenerator ticketNumberGenerator,
            WorkflowValidator workflowValidator,
            TicketHistoryService ticketHistoryService,
            SlaService slaService
    ) {
        this.ticketRepository = ticketRepository;
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
        this.ticketNumberGenerator = ticketNumberGenerator;
        this.workflowValidator = workflowValidator;
        this.ticketHistoryService = ticketHistoryService;
        this.slaService = slaService;
    }

    public Ticket createTicket(CreateTicketCommand command, AuthUserDetails reporterDetails) {
        validateCreateCommand(command);
        ensureCreateAllowed(reporterDetails);

        User reporter = userRepository.findById(reporterDetails.getId())
                .orElseThrow(() -> new EntityNotFoundException("Reporter not found"));

        Category category = categoryRepository.findById(command.categoryId())
                .orElseThrow(() -> new EntityNotFoundException("Category not found"));

        Ticket ticket = new Ticket(
                command.subject().trim(),
                command.description().trim(),
                command.priority() != null ? command.priority() : TicketPriority.MEDIUM,
                category,
                reporter
        );
        ticket.setRelatedAssetId(command.relatedAssetId());
        ticket.setTicketNumber(ticketNumberGenerator.nextTicketNumber());
        slaService.initializeSla(ticket, LocalDateTime.now());

        return ticketRepository.save(ticket);
    }

    @Transactional(readOnly = true)
    public Page<Ticket> findTickets(TicketFilterCriteria filter, AuthUserDetails actor, Pageable pageable) {
        Specification<Ticket> spec = TicketSpecifications.withFilters(
                filter.status(),
                filter.priority(),
                filter.assigneeId(),
                actor.getRole() == UserRole.END_USER ? actor.getId() : null
        );
        return ticketRepository.findAll(spec, pageable);
    }

    @Transactional(readOnly = true)
    public Ticket getTicket(Long ticketId, AuthUserDetails actor) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found"));
        ensureCanView(ticket, actor);
        return ticket;
    }

    public Ticket updateTicket(Long ticketId, UpdateTicketCommand command, AuthUserDetails actor) {
        ensureAgentOrAdmin(actor);
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found"));

        TicketPriority previousPriority = ticket.getPriority();

        boolean priorityChanged = command.priority() != null && command.priority() != ticket.getPriority();
        if (command.priority() != null) {
            ticket.setPriority(command.priority());
        }

        if (command.categoryId() != null) {
            Category category = categoryRepository.findById(command.categoryId())
                    .orElseThrow(() -> new EntityNotFoundException("Category not found"));
            ticket.setCategory(category);
        }

        if (Boolean.TRUE.equals(command.clearRelatedAsset())) {
            ticket.setRelatedAssetId(null);
        } else if (command.relatedAssetId() != null) {
            ticket.setRelatedAssetId(command.relatedAssetId());
        }

        if (command.assigneeId() != null) {
            User assignee = userRepository.findById(command.assigneeId())
                    .orElseThrow(() -> new EntityNotFoundException("Assignee not found"));
            if (!assignee.isActive()) {
                throw new IllegalArgumentException("Assignee must be active");
            }
            ticket.setAssignee(assignee);
        }

        if (priorityChanged) {
            slaService.applyDeadlines(ticket, LocalDateTime.now());
        }

        if (ACTIVE_STATUSES.contains(ticket.getStatus())) {
            ticket.setSlaFlag(slaService.evaluateFlag(ticket, LocalDateTime.now()));
        } else {
            ticket.setSlaFlag(TicketSlaFlag.OK);
        }

        return ticketRepository.save(ticket);
    }

    public void deleteTicket(Long ticketId, AuthUserDetails actor) {
        ensureAdmin(actor);
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found"));
        ticketRepository.delete(ticket);
    }

    public Ticket changeStatus(Long ticketId, TicketStatusChangeCommand command, AuthUserDetails actor) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found"));
        ensureCanView(ticket, actor);
        ensureStatusChangeAllowed(actor, command.toStatus(), ticket);

        workflowValidator.validateTransition(ticket, command.toStatus(), actor, command.note());

        TicketStatus previous = ticket.getStatus();
        ticket.setStatus(command.toStatus());

        switch (command.toStatus()) {
            case RESOLVED -> ticket.setResolvedAt(LocalDateTime.now());
            case CLOSED -> {
                ticket.setClosedAt(LocalDateTime.now());
                ticket.setSlaFlag(TicketSlaFlag.OK);
            }
            case REOPENED -> {
                ticket.setClosedAt(null);
                ticket.setResolvedAt(null);
                slaService.applyDeadlines(ticket, LocalDateTime.now());
            }
            default -> {
            }
        }

        if (ACTIVE_STATUSES.contains(command.toStatus())) {
            ticket.setSlaFlag(slaService.evaluateFlag(ticket, LocalDateTime.now()));
        }

        User actorEntity = userRepository.findById(actor.getId())
                .orElseThrow(() -> new EntityNotFoundException("Actor not found"));
        ticketHistoryService.recordStatusChange(ticket, previous, command.toStatus(), actorEntity, command.note());
        return ticketRepository.save(ticket);
    }

    public int autoCloseResolvedTickets(LocalDateTime threshold, String note) {
        List<Ticket> tickets = ticketRepository.findByStatusAndResolvedAtBefore(TicketStatus.RESOLVED, threshold);
        int count = 0;
        LocalDateTime now = LocalDateTime.now();
        for (Ticket ticket : tickets) {
            TicketStatus previous = ticket.getStatus();
            ticket.setStatus(TicketStatus.CLOSED);
            ticket.setClosedAt(now);
            ticket.setSlaFlag(TicketSlaFlag.OK);
            User actor = ticket.getAssignee() != null ? ticket.getAssignee() : ticket.getReporter();
            ticketHistoryService.recordStatusChange(ticket, previous, TicketStatus.CLOSED, actor, note);
            ticketRepository.save(ticket);
            count++;
        }
        return count;
    }

    private void validateCreateCommand(CreateTicketCommand command) {
        if (!StringUtils.hasText(command.subject()) || command.subject().trim().length() < 5) {
            throw new IllegalArgumentException("Subject must be at least 5 characters");
        }
        if (!StringUtils.hasText(command.description()) || command.description().trim().length() < 10) {
            throw new IllegalArgumentException("Description must be at least 10 characters");
        }
        if (command.categoryId() == null) {
            throw new IllegalArgumentException("Category is required");
        }
    }

    private void ensureCreateAllowed(AuthUserDetails actor) {
        if (actor.getRole() != UserRole.END_USER && actor.getRole() != UserRole.ADMIN) {
            throw new IllegalStateException("Only end user or admin can create tickets");
        }
    }

    private void ensureCanView(Ticket ticket, AuthUserDetails actor) {
        if (actor.getRole() == UserRole.END_USER && !ticket.getReporter().getId().equals(actor.getId())) {
            throw new IllegalStateException("You do not have access to this ticket");
        }
    }

    private void ensureStatusChangeAllowed(AuthUserDetails actor, TicketStatus targetStatus, Ticket ticket) {
        if (actor.getRole() == UserRole.END_USER) {
            if (targetStatus != TicketStatus.REOPENED || !ticket.getReporter().getId().equals(actor.getId())) {
                throw new IllegalStateException("End user can only reopen their own ticket");
            }
        } else if (actor.getRole() != UserRole.ADMIN && actor.getRole() != UserRole.AGENT) {
            throw new IllegalStateException("Unauthorized to change ticket status");
        }
    }

    private void ensureAdmin(AuthUserDetails actor) {
        if (actor.getRole() != UserRole.ADMIN) {
            throw new IllegalStateException("Only admin can perform this action");
        }
    }

    private void ensureAgentOrAdmin(AuthUserDetails actor) {
        if (actor.getRole() != UserRole.ADMIN && actor.getRole() != UserRole.AGENT) {
            throw new IllegalStateException("Only agent or admin can perform this action");
        }
    }
}
