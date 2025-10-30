package org.example.backend.domain.ticket.service;

import org.example.backend.domain.ticket.enums.TicketCategory;
import org.example.backend.domain.ticket.enums.TicketPriority;

public record UpdateTicketCommand(
        Long assigneeId,
        TicketPriority priority,
        TicketCategory category
) {
}
