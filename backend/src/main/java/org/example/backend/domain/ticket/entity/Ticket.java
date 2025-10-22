package org.example.backend.domain.ticket.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.example.backend.domain.ticket.enums.TicketPriority;
import org.example.backend.domain.ticket.enums.TicketSlaFlag;
import org.example.backend.domain.ticket.enums.TicketStatus;
import org.example.backend.domain.user.entity.User;

@Entity
@Table(name = "tickets")
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ticket_number", nullable = false, unique = true, length = 32)
    private String ticketNumber;

    @Column(nullable = false, length = 255)
    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private TicketStatus status = TicketStatus.NEW;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private TicketPriority priority = TicketPriority.MEDIUM;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private User assignee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(name = "related_asset_id")
    private Long relatedAssetId;

    @Column(name = "sla_response_deadline")
    private LocalDateTime slaResponseDeadline;

    @Column(name = "sla_resolution_deadline")
    private LocalDateTime slaResolutionDeadline;

    @Enumerated(EnumType.STRING)
    @Column(name = "sla_flag", length = 16)
    private TicketSlaFlag slaFlag = TicketSlaFlag.OK;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @OneToMany(mappedBy = "ticket")
    private List<TicketComment> comments = new ArrayList<>();

    @OneToMany(mappedBy = "ticket")
    private List<TicketHistory> history = new ArrayList<>();

    protected Ticket() {
        // JPA only
    }

    public Ticket(
            String subject,
            String description,
            TicketPriority priority,
            Category category,
            User reporter
    ) {
        this.subject = subject;
        this.description = description;
        this.priority = priority;
        this.category = category;
        this.reporter = reporter;
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.status == null) {
            this.status = TicketStatus.NEW;
        }
        if (this.priority == null) {
            this.priority = TicketPriority.MEDIUM;
        }
        if (this.slaFlag == null) {
            this.slaFlag = TicketSlaFlag.OK;
        }
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getTicketNumber() {
        return ticketNumber;
    }

    public void setTicketNumber(String ticketNumber) {
        this.ticketNumber = ticketNumber;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public TicketStatus getStatus() {
        return status;
    }

    public void setStatus(TicketStatus status) {
        this.status = status;
    }

    public TicketPriority getPriority() {
        return priority;
    }

    public void setPriority(TicketPriority priority) {
        this.priority = priority;
    }

    public User getReporter() {
        return reporter;
    }

    public void setReporter(User reporter) {
        this.reporter = reporter;
    }

    public User getAssignee() {
        return assignee;
    }

    public void setAssignee(User assignee) {
        this.assignee = assignee;
    }

    public Category getCategory() {
        return category;
    }

    public void setCategory(Category category) {
        this.category = category;
    }

    public Long getRelatedAssetId() {
        return relatedAssetId;
    }

    public void setRelatedAssetId(Long relatedAssetId) {
        this.relatedAssetId = relatedAssetId;
    }

    public LocalDateTime getSlaResponseDeadline() {
        return slaResponseDeadline;
    }

    public void setSlaResponseDeadline(LocalDateTime slaResponseDeadline) {
        this.slaResponseDeadline = slaResponseDeadline;
    }

    public LocalDateTime getSlaResolutionDeadline() {
        return slaResolutionDeadline;
    }

    public void setSlaResolutionDeadline(LocalDateTime slaResolutionDeadline) {
        this.slaResolutionDeadline = slaResolutionDeadline;
    }

    public TicketSlaFlag getSlaFlag() {
        return slaFlag;
    }

    public void setSlaFlag(TicketSlaFlag slaFlag) {
        this.slaFlag = slaFlag;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public LocalDateTime getResolvedAt() {
        return resolvedAt;
    }

    public void setResolvedAt(LocalDateTime resolvedAt) {
        this.resolvedAt = resolvedAt;
    }

    public LocalDateTime getClosedAt() {
        return closedAt;
    }

    public void setClosedAt(LocalDateTime closedAt) {
        this.closedAt = closedAt;
    }

    public List<TicketComment> getComments() {
        return comments;
    }

    public List<TicketHistory> getHistory() {
        return history;
    }
}
