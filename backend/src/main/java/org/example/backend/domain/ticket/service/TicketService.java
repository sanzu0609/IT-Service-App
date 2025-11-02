
package org.example.backend.domain.ticket.service;

import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import org.example.backend.domain.auth.service.AuthUserDetails;
import org.example.backend.domain.ticket.entity.Ticket;
import org.example.backend.domain.ticket.enums.TicketCategory;
import org.example.backend.domain.ticket.enums.TicketPriority;
import org.example.backend.domain.ticket.enums.TicketSlaFlag;
import org.example.backend.domain.ticket.enums.TicketStatus;
import org.example.backend.domain.ticket.repository.TicketRepository;
import org.example.backend.domain.ticket.repository.TicketSpecifications;
import org.example.backend.domain.user.entity.User;
import org.example.backend.domain.user.enums.UserRole;
import org.example.backend.domain.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@Transactional
public class TicketService {

    private static final Logger log = LoggerFactory.getLogger(TicketService.class);

    private static final EnumSet<TicketStatus> ACTIVE_STATUSES = EnumSet.of(
            TicketStatus.NEW,
            TicketStatus.IN_PROGRESS,
            TicketStatus.ON_HOLD,
            TicketStatus.REOPENED,
            TicketStatus.RESOLVED
    );

    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final TicketNumberGenerator ticketNumberGenerator;
    private final WorkflowValidator workflowValidator;
    private final TicketHistoryService ticketHistoryService;
    private final SlaService slaService;

    public TicketService(
            TicketRepository ticketRepository,
            UserRepository userRepository,
            TicketNumberGenerator ticketNumberGenerator,
            WorkflowValidator workflowValidator,
            TicketHistoryService ticketHistoryService,
            SlaService slaService
    ) {
        this.ticketRepository = ticketRepository;
        this.userRepository = userRepository;
        this.ticketNumberGenerator = ticketNumberGenerator;
        this.workflowValidator = workflowValidator;
        this.ticketHistoryService = ticketHistoryService;
        this.slaService = slaService;
    }

    public Ticket createTicket(CreateTicketCommand command, AuthUserDetails reporterDetails) {
        log.info("Creating ticket: subject='{}', priority={}, category={}, reporter={}", 
                command.subject(), command.priority(), command.category(), reporterDetails.getUsername());
        
        validateCreateCommand(command);
        ensureCreateAllowed(reporterDetails);

        User reporter = userRepository.findById(reporterDetails.getId())
                .orElseThrow(() -> new EntityNotFoundException("Reporter not found"));

        Ticket ticket = new Ticket(
                command.subject().trim(),
                command.description().trim(),
                command.priority() != null ? command.priority() : TicketPriority.MEDIUM,
                command.category(),
                reporter
        );
        ticket.setTicketNumber(ticketNumberGenerator.nextTicketNumber());
        slaService.initializeSla(ticket, LocalDateTime.now());

        Ticket saved = ticketRepository.save(ticket);
        log.info("Created ticket #{} with ID {}", saved.getTicketNumber(), saved.getId());
        return saved;
    }

    @Transactional(readOnly = true)
    public Page<Ticket> findTickets(TicketFilterCriteria filter, AuthUserDetails actor, Pageable pageable) {
        log.debug("Finding tickets with filter: status={}, priority={}, assigneeId={}, role={}", 
                filter.status(), filter.priority(), filter.assigneeId(), actor.getRole());
        
        Specification<Ticket> spec = TicketSpecifications.withFilters(
                filter.status(),
                filter.priority(),
                filter.assigneeId(),
                actor.getRole() == UserRole.END_USER ? actor.getId() : null
        );
        Page<Ticket> result = ticketRepository.findAll(spec, pageable);
        log.debug("Found {} tickets", result.getTotalElements());
        return result;
    }

    @Transactional(readOnly = true)
    public Ticket getTicket(Long ticketId, AuthUserDetails actor) {
        log.debug("Getting ticket {} for user {}", ticketId, actor.getUsername());
        
        Ticket ticket = ticketRepository.findWithHistoryById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found"));
        ensureCanView(ticket, actor);
        
        log.debug("Retrieved ticket #{} with {} history entries", 
                ticket.getTicketNumber(), ticket.getHistory().size());
        return ticket;
    }

    public Ticket updateTicket(Long ticketId, UpdateTicketCommand command, AuthUserDetails actor) {
        log.info("Updating ticket {}: priority={}, category={}, assigneeId={}, actor={}", 
                ticketId, command.priority(), command.category(), command.assigneeId(), actor.getUsername());
        
        ensureAgentOrAdmin(actor);
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found"));

        boolean priorityChanged = command.priority() != null && command.priority() != ticket.getPriority();
        if (command.priority() != null) {
            ticket.setPriority(command.priority());
        }

        if (command.category() != null) {
            ticket.setCategory(command.category());
        }

        if (command.assigneeId() != null) {
            User assignee = userRepository.findById(command.assigneeId())
                    .orElseThrow(() -> new EntityNotFoundException("Assignee not found"));
            if (!assignee.isActive()) {
                throw new IllegalArgumentException("Assignee must be active");
            }
            ticket.setAssignee(assignee);
            log.info("Assigned ticket {} to user {}", ticketId, assignee.getUsername());
        }

        if (priorityChanged) {
            slaService.applyDeadlines(ticket, LocalDateTime.now());
            log.info("Updated SLA deadlines for ticket {} due to priority change", ticketId);
        }

        if (ACTIVE_STATUSES.contains(ticket.getStatus())) {
            ticket.setSlaFlag(slaService.evaluateFlag(ticket, LocalDateTime.now()));
        } else {
            ticket.setSlaFlag(TicketSlaFlag.OK);
        }

        Ticket saved = ticketRepository.save(ticket);
        
        // Refetch with history to ensure lazy-loaded history is available
        return ticketRepository.findWithHistoryById(saved.getId())
                .orElse(saved);
    }

    public void deleteTicket(Long ticketId, AuthUserDetails actor) {
        log.warn("Deleting ticket {} by admin user {}", ticketId, actor.getUsername());
        
        ensureAdmin(actor);
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found"));
        ticketRepository.delete(ticket);
        
        log.info("Deleted ticket #{} (ID: {})", ticket.getTicketNumber(), ticketId);
    }

    @Transactional
    public Ticket changeStatus(Long ticketId, TicketStatusChangeCommand command, AuthUserDetails actor) {
        log.info("Changing ticket {} status to {} by user {}, note: '{}'", 
                ticketId, command.toStatus(), actor.getUsername(), command.note());
        
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
            case CANCELLED -> {
                // Mark cancelled tickets similar to closed: set closed time, clear resolved, and reset SLA
                ticket.setClosedAt(LocalDateTime.now());
                ticket.setResolvedAt(null);
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

        // Save ticket first to ensure it's persisted
        Ticket saved = ticketRepository.save(ticket);
        
        // Then record history with the saved ticket
        User actorEntity = userRepository.findById(actor.getId())
                .orElseThrow(() -> new EntityNotFoundException("Actor not found"));
        ticketHistoryService.recordStatusChange(saved, previous, command.toStatus(), actorEntity, command.note());
        
        log.info("Changed ticket #{} status from {} to {}", saved.getTicketNumber(), previous, command.toStatus());
        
        // Refetch with history to ensure lazy-loaded history is available
        return ticketRepository.findWithHistoryById(saved.getId())
                .orElse(saved);
    }

    public int autoCloseResolvedTickets(LocalDateTime threshold, String note) {
        log.info("Auto-closing tickets resolved before {}", threshold);
        
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

    @Transactional
    public int reinitializeAllSla() {
        List<Ticket> tickets = ticketRepository.findAll();
        int count = 0;
        LocalDateTime now = LocalDateTime.now();
        for (Ticket ticket : tickets) {
            slaService.initializeSla(ticket, now);
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
        if (command.category() == null) {
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
