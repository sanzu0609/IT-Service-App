
package org.example.backend.domain.ticket.service;

import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import org.example.backend.domain.auth.service.AuthUserDetails;
import org.example.backend.domain.ticket.entity.Ticket;
import org.example.backend.domain.ticket.entity.TicketComment;
import org.example.backend.domain.ticket.repository.TicketCommentRepository;
import org.example.backend.domain.ticket.repository.TicketRepository;
import org.example.backend.domain.user.entity.User;
import org.example.backend.domain.user.enums.UserRole;
import org.example.backend.domain.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@Transactional
public class CommentService {

    private final TicketRepository ticketRepository;
    private final TicketCommentRepository ticketCommentRepository;
    private final UserRepository userRepository;

    public CommentService(
            TicketRepository ticketRepository,
            TicketCommentRepository ticketCommentRepository,
            UserRepository userRepository
    ) {
        this.ticketRepository = ticketRepository;
        this.ticketCommentRepository = ticketCommentRepository;
        this.userRepository = userRepository;
    }

    public TicketComment addComment(Long ticketId, AuthUserDetails actor, String content, boolean internal) {
        if (!StringUtils.hasText(content)) {
            throw new IllegalArgumentException("Comment content must not be empty");
        }

        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found"));

        if (actor.getRole() == UserRole.END_USER && !ticket.getReporter().getId().equals(actor.getId())) {
            throw new IllegalStateException("You do not have access to this ticket");
        }

        if (internal && actor.getRole() == UserRole.END_USER) {
            throw new IllegalStateException("End user cannot create internal comment");
        }

        User author = userRepository.findById(actor.getId())
                .orElseThrow(() -> new EntityNotFoundException("Author not found"));

        TicketComment comment = new TicketComment(ticket, author, content.trim(), internal);
        return ticketCommentRepository.save(comment);
    }

    @Transactional(readOnly = true)
    public List<TicketComment> findComments(Long ticketId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found"));
        return ticketCommentRepository.findByTicketOrderByCreatedAtAsc(ticket);
    }
}
