package org.example.backend.domain.ticket.service;

import org.example.backend.domain.ticket.enums.TicketStatus;

public record TicketStatusChangeCommand(
        TicketStatus toStatus,
        String note
) {
}
