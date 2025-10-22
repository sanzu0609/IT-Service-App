package org.example.backend.domain.ticket.service;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;
import org.example.backend.domain.ticket.entity.Ticket;
import org.example.backend.domain.ticket.enums.TicketStatus;
import org.example.backend.domain.user.enums.UserRole;
import org.example.backend.domain.auth.service.AuthUserDetails;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class WorkflowValidator {

    private final Map<TicketStatus, Set<TicketStatus>> transitions = new EnumMap<>(TicketStatus.class);

    public WorkflowValidator() {
        transitions.put(TicketStatus.NEW, EnumSet.of(TicketStatus.IN_PROGRESS));
        transitions.put(TicketStatus.IN_PROGRESS, EnumSet.of(TicketStatus.ON_HOLD, TicketStatus.RESOLVED));
        transitions.put(TicketStatus.ON_HOLD, EnumSet.of(TicketStatus.IN_PROGRESS));
        transitions.put(TicketStatus.RESOLVED, EnumSet.of(TicketStatus.CLOSED, TicketStatus.REOPENED));
        transitions.put(TicketStatus.CLOSED, EnumSet.of(TicketStatus.REOPENED));
        transitions.put(TicketStatus.REOPENED, EnumSet.of(TicketStatus.IN_PROGRESS));
    }

    public void validateTransition(Ticket ticket, TicketStatus targetStatus, AuthUserDetails actor, String note) {
        TicketStatus currentStatus = ticket.getStatus();
        if (currentStatus == targetStatus) {
            throw new IllegalStateException("Ticket is already in status " + targetStatus);
        }

        Set<TicketStatus> allowedTargets = transitions.getOrDefault(currentStatus, Set.of());
        if (!allowedTargets.contains(targetStatus)) {
            throw new IllegalStateException("Cannot transition from %s to %s".formatted(currentStatus, targetStatus));
        }

        switch (currentStatus) {
            case NEW -> validateNewToInProgress(ticket);
            case IN_PROGRESS -> validateInProgressTransition(targetStatus, note);
            case RESOLVED -> validateResolvedTransition(ticket, targetStatus, actor);
            default -> {
                // no-op for other states
            }
        }
    }

    private void validateNewToInProgress(Ticket ticket) {
        if (ticket.getAssignee() == null) {
            throw new IllegalStateException("Cannot move to IN_PROGRESS without an assignee");
        }
    }

    private void validateInProgressTransition(TicketStatus targetStatus, String note) {
        if (targetStatus == TicketStatus.RESOLVED && !StringUtils.hasText(note)) {
            throw new IllegalArgumentException("Resolution note is required when resolving a ticket");
        }
    }

    private void validateResolvedTransition(Ticket ticket, TicketStatus targetStatus, AuthUserDetails actor) {
        if (targetStatus == TicketStatus.REOPENED) {
            if (actor == null || actor.getRole() != UserRole.END_USER) {
                throw new IllegalStateException("Only the reporter can reopen a resolved ticket");
            }
            if (!ticket.getReporter().getId().equals(actor.getId())) {
                throw new IllegalStateException("Only the reporter can reopen their ticket");
            }
        }
    }
}

