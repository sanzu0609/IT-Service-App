package org.example.backend.domain.ticket.service;

import org.example.backend.domain.ticket.enums.TicketPriority;

public record UpdateTicketCommand(
        Long assigneeId,
        TicketPriority priority,
        Long categoryId,
        boolean relatedAssetProvided,
        Long relatedAssetId
) {
}
