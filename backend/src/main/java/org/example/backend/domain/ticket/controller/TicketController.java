
package org.example.backend.domain.ticket.controller;

import jakarta.validation.Valid;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import org.example.backend.domain.auth.controller.AuthControllerUtils;
import org.example.backend.domain.auth.service.AuthUserDetails;
import org.example.backend.domain.ticket.dto.request.ChangeStatusRequest;
import org.example.backend.domain.ticket.dto.request.CreateCommentRequest;
import org.example.backend.domain.ticket.dto.request.CreateTicketRequest;
import org.example.backend.domain.ticket.dto.request.UpdateTicketRequest;
import org.example.backend.domain.ticket.dto.response.TicketDetailResponse;
import org.example.backend.domain.ticket.dto.response.TicketSummaryResponse;
import org.example.backend.domain.ticket.entity.Ticket;
import org.example.backend.domain.ticket.entity.TicketComment;
import org.example.backend.domain.ticket.entity.TicketHistory;
import org.example.backend.domain.ticket.enums.TicketCategory;
import org.example.backend.domain.ticket.enums.TicketPriority;
import org.example.backend.domain.ticket.enums.TicketStatus;
import org.example.backend.domain.ticket.service.CommentService;
import org.example.backend.domain.ticket.service.CreateTicketCommand;
import org.example.backend.domain.ticket.service.TicketFilterCriteria;
import org.example.backend.domain.ticket.service.TicketService;
import org.example.backend.domain.ticket.service.TicketStatusChangeCommand;
import org.example.backend.domain.ticket.service.UpdateTicketCommand;
import org.example.backend.domain.user.enums.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tickets")
@Validated
public class TicketController {

    private final TicketService ticketService;
    private final CommentService commentService;

    public TicketController(TicketService ticketService, CommentService commentService) {
        this.ticketService = ticketService;
        this.commentService = commentService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('END_USER','ADMIN')")
    public ResponseEntity<TicketSummaryResponse> createTicket(
            Authentication authentication,
            @Valid @RequestBody CreateTicketRequest request
    ) {
        AuthUserDetails actor = AuthControllerUtils.requirePrincipal(authentication);
        if (actor.getRole() != UserRole.END_USER && actor.getRole() != UserRole.ADMIN) {
            throw new IllegalStateException("Only end user or admin can create tickets");
        }

        Ticket ticket = ticketService.createTicket(
                new CreateTicketCommand(
                        request.subject(),
                        request.description(),
                        request.priority(),
                        request.category()
                ),
                actor
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(toSummaryResponse(ticket));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public Page<TicketSummaryResponse> listTickets(
            Authentication authentication,
            @RequestParam(value = "status", required = false) TicketStatus status,
            @RequestParam(value = "priority", required = false) TicketPriority priority,
            @RequestParam(value = "assigneeId", required = false) Long assigneeId,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable
    ) {
        AuthUserDetails actor = AuthControllerUtils.requirePrincipal(authentication);
        return ticketService.findTickets(new TicketFilterCriteria(status, priority, assigneeId), actor, pageable)
                .map(this::toSummaryResponse);
    }

    @GetMapping("/categories")
    @PreAuthorize("isAuthenticated()")
    public List<TicketCategoryResponse> listCategories() {
        return Arrays.stream(TicketCategory.values())
                .map(category -> new TicketCategoryResponse(category.name(), category.getLabel()))
                .toList();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public TicketDetailResponse getTicket(@PathVariable Long id, Authentication authentication) {
        AuthUserDetails actor = AuthControllerUtils.requirePrincipal(authentication);
        Ticket ticket = ticketService.getTicket(id, actor);
        List<TicketComment> comments = commentService.findComments(id);
        return toDetailResponse(ticket, comments, actor.getRole());
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    public TicketDetailResponse updateTicket(
            @PathVariable Long id,
            Authentication authentication,
            @Valid @RequestBody UpdateTicketRequest request
    ) {
        AuthUserDetails actor = AuthControllerUtils.requirePrincipal(authentication);
        Ticket ticket = ticketService.updateTicket(
                id,
                new UpdateTicketCommand(
                        request.assigneeId(),
                        request.priority(),
                        request.category()
                ),
                actor
        );
        List<TicketComment> comments = commentService.findComments(id);
        return toDetailResponse(ticket, comments, actor.getRole());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteTicket(@PathVariable Long id, Authentication authentication) {
        AuthUserDetails actor = AuthControllerUtils.requirePrincipal(authentication);
        ticketService.deleteTicket(id, actor);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/comments")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<TicketDetailResponse.CommentResponse> addComment(
            @PathVariable Long id,
            Authentication authentication,
            @Valid @RequestBody CreateCommentRequest request
    ) {
        AuthUserDetails actor = AuthControllerUtils.requirePrincipal(authentication);
        boolean internal = Boolean.TRUE.equals(request.isInternal());
        TicketComment comment = commentService.addComment(id, actor, request.content(), internal);
        return ResponseEntity.status(HttpStatus.CREATED).body(toCommentResponse(comment));
    }

    @GetMapping("/{id}/comments")
    @PreAuthorize("isAuthenticated()")
    public List<TicketDetailResponse.CommentResponse> listComments(
            @PathVariable Long id,
            Authentication authentication
    ) {
        AuthUserDetails actor = AuthControllerUtils.requirePrincipal(authentication);
        ticketService.getTicket(id, actor); // ensure access
        return commentService.findComments(id).stream()
                .filter(comment -> !comment.isInternal() || actor.getRole() != UserRole.END_USER)
                .map(this::toCommentResponse)
                .collect(Collectors.toList());
    }

    @PostMapping("/{id}/status")
    @PreAuthorize("isAuthenticated()")
    public TicketDetailResponse changeStatus(
            @PathVariable Long id,
            Authentication authentication,
            @Valid @RequestBody ChangeStatusRequest request
    ) {
        AuthUserDetails actor = AuthControllerUtils.requirePrincipal(authentication);
        Ticket ticket = ticketService.changeStatus(id, new TicketStatusChangeCommand(
                request.toStatus(),
                request.note()
        ), actor);
        List<TicketComment> comments = commentService.findComments(id);
        return toDetailResponse(ticket, comments, actor.getRole());
    }

    private TicketSummaryResponse toSummaryResponse(Ticket ticket) {
        return new TicketSummaryResponse(
                ticket.getId(),
                ticket.getTicketNumber(),
                ticket.getSubject(),
                ticket.getStatus().name(),
                ticket.getPriority().name(),
                ticket.getCategory().name(),
                ticket.getAssignee() != null ? ticket.getAssignee().getId() : null,
                ticket.getAssignee() != null ? ticket.getAssignee().getFullName() : null,
                ticket.getAssignee() != null ? ticket.getAssignee().getUsername() : null,
                                ticket.getCreatedAt(),
                                ticket.getSlaResponseDeadline(),
                                ticket.getSlaResolutionDeadline(),
                                ticket.getSlaFlag() != null ? ticket.getSlaFlag().name() : null
        );
    }

    private TicketDetailResponse toDetailResponse(Ticket ticket, List<TicketComment> comments, UserRole role) {
        List<TicketDetailResponse.CommentResponse> commentResponses = comments.stream()
                .filter(comment -> !comment.isInternal() || role != UserRole.END_USER)
                .map(this::toCommentResponse)
                .collect(Collectors.toList());

        List<TicketDetailResponse.HistoryResponse> historyResponses = ticket.getHistory().stream()
                .map(this::toHistoryResponse)
                .collect(Collectors.toList());

        return new TicketDetailResponse(
                ticket.getId(),
                ticket.getTicketNumber(),
                ticket.getSubject(),
                ticket.getDescription(),
                ticket.getStatus().name(),
                ticket.getPriority().name(),
                ticket.getCategory().name(),
                ticket.getCategory().getLabel(),
                ticket.getReporter().getId(),
                ticket.getReporter().getFullName(),
                ticket.getReporter().getUsername(),
                ticket.getAssignee() != null ? ticket.getAssignee().getId() : null,
                ticket.getAssignee() != null ? ticket.getAssignee().getFullName() : null,
                ticket.getAssignee() != null ? ticket.getAssignee().getUsername() : null,
                ticket.getSlaResponseDeadline(),
                ticket.getSlaResolutionDeadline(),
                ticket.getSlaFlag() != null ? ticket.getSlaFlag().name() : null,
                ticket.getCreatedAt(),
                ticket.getUpdatedAt(),
                ticket.getResolvedAt(),
                ticket.getClosedAt(),
                commentResponses,
                historyResponses
        );
    }

    private TicketDetailResponse.CommentResponse toCommentResponse(TicketComment comment) {
        String authorLabel = null;
        if (comment.getAuthor() != null) {
            String fullName = comment.getAuthor().getFullName();
            String username = comment.getAuthor().getUsername();
            authorLabel = (fullName != null && !fullName.isBlank()) ? fullName : username;
        }

        return new TicketDetailResponse.CommentResponse(
                comment.getId(),
                authorLabel,
                comment.isInternal(),
                comment.getContent(),
                comment.getCreatedAt()
        );
    }

    private TicketDetailResponse.HistoryResponse toHistoryResponse(TicketHistory history) {
        return new TicketDetailResponse.HistoryResponse(
                history.getId(),
                history.getFromStatus(),
                history.getToStatus(),
                history.getChangedBy().getUsername(),
                history.getNote(),
                history.getCreatedAt()
        );
    }

    public record TicketCategoryResponse(String code, String label) {
    }
}
