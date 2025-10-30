package org.example.backend.domain.ticket.dto.response;

import java.time.LocalDateTime;

public record TicketSummaryResponse(
        Long id,
        String ticketNumber,
        String subject,
        String status,
        String priority,
        String category,
        Long assigneeId,
        String assigneeFullName,
        String assigneeUsername,
        LocalDateTime createdAt
) {
}

