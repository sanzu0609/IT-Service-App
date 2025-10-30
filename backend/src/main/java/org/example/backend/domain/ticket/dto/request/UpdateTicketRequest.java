package org.example.backend.domain.ticket.dto.request;

import org.example.backend.domain.ticket.enums.TicketCategory;
import org.example.backend.domain.ticket.enums.TicketPriority;

public record UpdateTicketRequest(
        Long assigneeId,
        TicketPriority priority,
        TicketCategory category
) {
}
