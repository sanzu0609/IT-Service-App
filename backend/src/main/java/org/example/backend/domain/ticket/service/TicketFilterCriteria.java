package org.example.backend.domain.ticket.service;

import org.example.backend.domain.ticket.enums.TicketPriority;
import org.example.backend.domain.ticket.enums.TicketStatus;

public record TicketFilterCriteria(
        TicketStatus status,
        TicketPriority priority,
        Long assigneeId
) {
}
