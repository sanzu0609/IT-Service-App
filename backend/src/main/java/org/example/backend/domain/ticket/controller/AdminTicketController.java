package org.example.backend.domain.ticket.controller;

import java.time.LocalDateTime;
import org.example.backend.domain.ticket.service.TicketService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/tickets")
public class AdminTicketController {

    private final TicketService ticketService;

    public AdminTicketController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @PostMapping("/reinit-sla")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ReinitResponse> reinitializeAllSla() {
        int count = ticketService.reinitializeAllSla();
        return ResponseEntity.ok(new ReinitResponse(count, LocalDateTime.now()));
    }

    public record ReinitResponse(int processed, LocalDateTime executedAt) {}
}
