
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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@Transactional
public class CommentService {

    private static final Logger log = LoggerFactory.getLogger(CommentService.class);
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
        log.info("Adding comment to ticket {}: internal={}, author={}, length={}", 
                ticketId, internal, actor.getUsername(), content.length());
        
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
        TicketComment saved = ticketCommentRepository.save(comment);
        log.info("Added comment {} to ticket #{}", saved.getId(), ticket.getTicketNumber());
        return saved;
    }

    @Transactional(readOnly = true)
    public List<TicketComment> findComments(Long ticketId) {
        log.debug("Finding comments for ticket {}", ticketId);
        
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found"));
        List<TicketComment> comments = ticketCommentRepository.findByTicketOrderByCreatedAtAsc(ticket);
        log.debug("Found {} comments for ticket {}", comments.size(), ticketId);
        return comments;
    }
}
