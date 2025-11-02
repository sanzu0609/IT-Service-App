package org.example.backend.domain.ticket.service;

import org.example.backend.domain.ticket.entity.Ticket;
import org.example.backend.domain.ticket.entity.TicketHistory;
import org.example.backend.domain.ticket.enums.TicketStatus;
import org.example.backend.domain.ticket.repository.TicketHistoryRepository;
import org.example.backend.domain.user.entity.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TicketHistoryService {

    private static final Logger log = LoggerFactory.getLogger(TicketHistoryService.class);
    private final TicketHistoryRepository ticketHistoryRepository;

    public TicketHistoryService(TicketHistoryRepository ticketHistoryRepository) {
        this.ticketHistoryRepository = ticketHistoryRepository;
    }

    @Transactional
    public void recordStatusChange(Ticket ticket, TicketStatus from, TicketStatus to, User actor, String note) {
        log.info("Recording status change for ticket {}: {} -> {} by user {}", 
                ticket.getId(), from, to, actor.getUsername());
        TicketHistory history = new TicketHistory(ticket, from, to, actor, note);
        TicketHistory saved = ticketHistoryRepository.save(history);
        log.info("Saved history entry with ID: {}", saved.getId());
    }
}
