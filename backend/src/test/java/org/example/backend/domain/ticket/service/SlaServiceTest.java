package org.example.backend.domain.ticket.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import org.example.backend.domain.ticket.entity.Ticket;
import org.example.backend.domain.ticket.enums.TicketPriority;
import org.example.backend.domain.ticket.enums.TicketSlaFlag;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class SlaServiceTest {

    private SlaService slaService;
    private Ticket ticket;

    @BeforeEach
    void setUp() {
        slaService = new SlaService();
        ticket = new Ticket(null, null, TicketPriority.MEDIUM, null, null);
        ReflectionTestUtils.setField(ticket, "priority", TicketPriority.MEDIUM);
    }

    @Test
    void initializeSla_setsDeadlinesAndFlag() {
        LocalDateTime base = LocalDateTime.of(2025, 1, 1, 8, 0);

        slaService.initializeSla(ticket, base);

        assertThat(ticket.getSlaResponseDeadline()).isEqualTo(base.plusHours(8));
        assertThat(ticket.getSlaResolutionDeadline()).isEqualTo(base.plusHours(48));
        assertThat(ticket.getSlaFlag()).isEqualTo(TicketSlaFlag.OK);
    }

    @Test
    void applyDeadlines_updatesDeadlinesWhenPriorityChanges() {
        LocalDateTime base = LocalDateTime.of(2025, 1, 1, 8, 0);
        ReflectionTestUtils.setField(ticket, "priority", TicketPriority.CRITICAL);

        slaService.applyDeadlines(ticket, base);

        assertThat(ticket.getSlaResponseDeadline()).isEqualTo(base.plusHours(1));
        assertThat(ticket.getSlaResolutionDeadline()).isEqualTo(base.plusHours(8));
    }

    @Test
    void evaluateFlag_returnNearWhenElapsed80Percent() {
        ReflectionTestUtils.setField(ticket, "priority", TicketPriority.HIGH);
        LocalDateTime start = LocalDateTime.of(2025, 1, 1, 8, 0);
        ticket.setSlaResponseDeadline(start.plusHours(4));
        ticket.setSlaResolutionDeadline(start.plusHours(24));

        TicketSlaFlag flag = slaService.evaluateFlag(ticket, start.plusHours(3).plusMinutes(12));

        assertThat(flag).isEqualTo(TicketSlaFlag.NEAR);
    }

    @Test
    void evaluateFlag_returnBreachedWhenPastDeadline() {
        ReflectionTestUtils.setField(ticket, "priority", TicketPriority.HIGH);
        LocalDateTime start = LocalDateTime.of(2025, 1, 1, 8, 0);
        ticket.setSlaResponseDeadline(start.plusHours(4));
        ticket.setSlaResolutionDeadline(start.plusHours(24));

        TicketSlaFlag flag = slaService.evaluateFlag(ticket, start.plusHours(5));

        assertThat(flag).isEqualTo(TicketSlaFlag.BREACHED);
    }
}