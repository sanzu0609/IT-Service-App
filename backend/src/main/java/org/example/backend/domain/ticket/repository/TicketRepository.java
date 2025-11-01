package org.example.backend.domain.ticket.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.example.backend.domain.ticket.entity.Ticket;
import org.example.backend.domain.ticket.enums.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.stereotype.Repository;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long>, JpaSpecificationExecutor<Ticket> {

    List<Ticket> findByStatusIn(List<TicketStatus> statuses);

    List<Ticket> findByStatusAndResolvedAtBefore(TicketStatus status, LocalDateTime threshold);

    boolean existsByTicketNumber(String ticketNumber);

    @EntityGraph(attributePaths = {"history", "history.changedBy"})
    Optional<Ticket> findWithHistoryById(Long id);
}
