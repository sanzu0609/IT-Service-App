package org.example.backend.domain.ticket.repository;

import java.util.List;
import org.example.backend.domain.ticket.entity.Ticket;
import org.example.backend.domain.ticket.entity.TicketComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TicketCommentRepository extends JpaRepository<TicketComment, Long> {

    List<TicketComment> findByTicketOrderByCreatedAtAsc(Ticket ticket);
}
