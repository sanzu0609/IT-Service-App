package org.example.backend.domain.ticket.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.example.backend.domain.ticket.enums.TicketCategory;
import org.example.backend.domain.ticket.enums.TicketPriority;

public record CreateTicketRequest(
        @NotBlank(message = "Subject must not be blank")
        @Size(min = 5, max = 255, message = "Subject must be between 5 and 255 characters")
        String subject,

        @NotBlank(message = "Description must not be blank")
        @Size(min = 10, message = "Description must be at least 10 characters")
        String description,

        TicketPriority priority,

        @NotNull(message = "Category is required")
        TicketCategory category
) {
}
