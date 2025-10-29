package org.example.backend.domain.ticket.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record TicketDetailResponse(
        Long id,
        String ticketNumber,
        String subject,
        String description,
        String status,
        String priority,
        String category,
        String categoryLabel,
        Long reporterId,
        Long assigneeId,
        Long relatedAssetId,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime resolvedAt,
        LocalDateTime closedAt,
        List<CommentResponse> comments,
        List<HistoryResponse> history
) {

    public record CommentResponse(
            Long id,
            String author,
            boolean internal,
            String content,
            LocalDateTime createdAt
    ) {
    }

    public record HistoryResponse(
            Long id,
            String fromStatus,
            String toStatus,
            String changedBy,
            String note,
            LocalDateTime createdAt
    ) {
    }
}
