package org.example.backend.domain.ticket.service;

import org.example.backend.domain.ticket.entity.Ticket;
import org.example.backend.domain.ticket.entity.TicketHistory;
import org.example.backend.domain.ticket.enums.TicketStatus;
import org.example.backend.domain.ticket.repository.TicketHistoryRepository;
import org.example.backend.domain.user.entity.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TicketHistoryService {

    private final TicketHistoryRepository ticketHistoryRepository;

    public TicketHistoryService(TicketHistoryRepository ticketHistoryRepository) {
        this.ticketHistoryRepository = ticketHistoryRepository;
    }

    @Transactional
    public void recordStatusChange(Ticket ticket, TicketStatus from, TicketStatus to, User actor, String note) {
        TicketHistory history = new TicketHistory(ticket, from, to, actor, note);
        ticketHistoryRepository.save(history);
    }
}
