package org.example.backend.domain.ticket.dto.request;

import org.example.backend.domain.ticket.enums.TicketPriority;

public record UpdateTicketRequest(
        Long assigneeId,
        TicketPriority priority,
        Long categoryId,
        Boolean clearRelatedAsset,
        Long relatedAssetId
) {
}
