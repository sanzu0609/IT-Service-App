package org.example.backend.domain.ticket.service;

import org.example.backend.domain.ticket.enums.TicketCategory;
import org.example.backend.domain.ticket.enums.TicketPriority;

public record CreateTicketCommand(
        String subject,
        String description,
        TicketPriority priority,
        TicketCategory category
) {
}
