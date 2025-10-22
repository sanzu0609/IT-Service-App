package org.example.backend.domain.ticket.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CreateCommentRequest(
        @NotBlank(message = "Content must not be blank")
        String content,
        Boolean isInternal
) {
}
