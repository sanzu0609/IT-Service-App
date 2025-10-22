package org.example.backend.domain.ticket.dto.request;

import jakarta.validation.constraints.NotNull;
import org.example.backend.domain.ticket.enums.TicketStatus;

public record ChangeStatusRequest(
        @NotNull(message = "Target status is required")
        TicketStatus toStatus,
        String note
) {
}
