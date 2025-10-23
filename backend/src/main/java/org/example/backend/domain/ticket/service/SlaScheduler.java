package org.example.backend.domain.ticket.service;

import java.time.LocalDateTime;
import java.util.List;
import org.example.backend.domain.ticket.entity.Ticket;
import org.example.backend.domain.ticket.enums.TicketSlaFlag;
import org.example.backend.domain.ticket.enums.TicketStatus;
import org.example.backend.domain.ticket.repository.TicketRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class SlaScheduler {

    private static final Logger log = LoggerFactory.getLogger(SlaScheduler.class);

    private final TicketRepository ticketRepository;
    private final TicketService ticketService;
    private final SlaService slaService;
    private final int autoCloseDays;

    public SlaScheduler(
            TicketRepository ticketRepository,
            TicketService ticketService,
            SlaService slaService,
            @Value("${app.sla.autoclose.days:7}") int autoCloseDays
    ) {
        this.ticketRepository = ticketRepository;
        this.ticketService = ticketService;
        this.slaService = slaService;
        this.autoCloseDays = autoCloseDays;
    }

    @Scheduled(fixedRate = 15 * 60 * 1000)
    @Transactional
    public void runSlaChecker() {
        List<TicketStatus> statuses = List.of(
                TicketStatus.NEW,
                TicketStatus.IN_PROGRESS,
                TicketStatus.ON_HOLD,
                TicketStatus.REOPENED,
                TicketStatus.RESOLVED
        );
        List<Ticket> tickets = ticketRepository.findByStatusIn(statuses);
        LocalDateTime now = LocalDateTime.now();
        int updated = 0;
        int near = 0;
        int breached = 0;

        for (Ticket ticket : tickets) {
            TicketSlaFlag newFlag = slaService.evaluateFlag(ticket, now);
            if (newFlag != ticket.getSlaFlag()) {
                ticket.setSlaFlag(newFlag);
                ticketRepository.save(ticket);
                updated++;
                if (newFlag == TicketSlaFlag.NEAR) {
                    near++;
                } else if (newFlag == TicketSlaFlag.BREACHED) {
                    breached++;
                }
            }
        }

        if (updated > 0) {
            log.info("[SLA-CHECK] updated={} (near={}, breached={})", updated, near, breached);
        }
    }

    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void runAutoClose() {
        LocalDateTime threshold = LocalDateTime.now().minusDays(autoCloseDays);
        int closed = ticketService.autoCloseResolvedTickets(threshold, "Auto closed by system");
        if (closed > 0) {
            log.info("[SLA-AUTO-CLOSE] closed {} tickets (threshold={} days)", closed, autoCloseDays);
        }
    }
}
