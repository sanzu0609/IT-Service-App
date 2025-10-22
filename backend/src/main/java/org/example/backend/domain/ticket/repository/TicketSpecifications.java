package org.example.backend.domain.ticket.repository;

import java.time.LocalDateTime;
import org.example.backend.domain.ticket.entity.Ticket;
import org.example.backend.domain.ticket.enums.TicketPriority;
import org.example.backend.domain.ticket.enums.TicketStatus;
import org.springframework.data.jpa.domain.Specification;

public final class TicketSpecifications {

    private TicketSpecifications() {
    }

    public static Specification<Ticket> withFilters(
            TicketStatus status,
            TicketPriority priority,
            Long assigneeId,
            Long reporterId
    ) {
        return Specification
                .where(statusEquals(status))
                .and(priorityEquals(priority))
                .and(assigneeEquals(assigneeId))
                .and(reporterEquals(reporterId));
    }

    public static Specification<Ticket> statusEquals(TicketStatus status) {
        if (status == null) {
            return null;
        }
        return (root, query, builder) -> builder.equal(root.get("status"), status);
    }

    public static Specification<Ticket> priorityEquals(TicketPriority priority) {
        if (priority == null) {
            return null;
        }
        return (root, query, builder) -> builder.equal(root.get("priority"), priority);
    }

    public static Specification<Ticket> assigneeEquals(Long assigneeId) {
        if (assigneeId == null) {
            return null;
        }
        return (root, query, builder) -> builder.equal(root.get("assignee").get("id"), assigneeId);
    }

    public static Specification<Ticket> reporterEquals(Long reporterId) {
        if (reporterId == null) {
            return null;
        }
        return (root, query, builder) -> builder.equal(root.get("reporter").get("id"), reporterId);
    }

    public static Specification<Ticket> createdAfter(LocalDateTime threshold) {
        if (threshold == null) {
            return null;
        }
        return (root, query, builder) -> builder.greaterThanOrEqualTo(root.get("createdAt"), threshold);
    }
}
