package org.example.backend.domain.ticket.repository;

import java.util.List;
import org.example.backend.domain.ticket.entity.Ticket;
import org.example.backend.domain.ticket.entity.TicketHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TicketHistoryRepository extends JpaRepository<TicketHistory, Long> {

    List<TicketHistory> findByTicketOrderByCreatedAtAsc(Ticket ticket);
}
