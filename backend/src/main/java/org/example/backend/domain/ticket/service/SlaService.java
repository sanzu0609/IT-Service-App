package org.example.backend.domain.ticket.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.Map;
import org.example.backend.domain.ticket.entity.Ticket;
import org.example.backend.domain.ticket.enums.TicketPriority;
import org.example.backend.domain.ticket.enums.TicketSlaFlag;
import org.springframework.stereotype.Service;

@Service
public class SlaService {

    private static final Map<TicketPriority, Duration> RESPONSE_DEADLINES = new EnumMap<>(TicketPriority.class);
    private static final Map<TicketPriority, Duration> RESOLUTION_DEADLINES = new EnumMap<>(TicketPriority.class);
    private static final double NEAR_THRESHOLD = 0.8;

    static {
        RESPONSE_DEADLINES.put(TicketPriority.LOW, Duration.ofHours(12));
        RESPONSE_DEADLINES.put(TicketPriority.MEDIUM, Duration.ofHours(8));
        RESPONSE_DEADLINES.put(TicketPriority.HIGH, Duration.ofHours(4));
        RESPONSE_DEADLINES.put(TicketPriority.CRITICAL, Duration.ofHours(1));

        RESOLUTION_DEADLINES.put(TicketPriority.LOW, Duration.ofHours(72));
        RESOLUTION_DEADLINES.put(TicketPriority.MEDIUM, Duration.ofHours(48));
        RESOLUTION_DEADLINES.put(TicketPriority.HIGH, Duration.ofHours(24));
        RESOLUTION_DEADLINES.put(TicketPriority.CRITICAL, Duration.ofHours(8));
    }

    public void initializeSla(Ticket ticket, LocalDateTime baseTime) {
        applyDeadlines(ticket, baseTime);
        ticket.setSlaFlag(TicketSlaFlag.OK);
    }

    public void applyDeadlines(Ticket ticket, LocalDateTime baseTime) {
        Duration response = RESPONSE_DEADLINES.get(ticket.getPriority());
        Duration resolution = RESOLUTION_DEADLINES.get(ticket.getPriority());

        if (response != null) {
            ticket.setSlaResponseDeadline(baseTime.plus(response));
        }
        if (resolution != null) {
            ticket.setSlaResolutionDeadline(baseTime.plus(resolution));
        }
        ticket.setSlaFlag(TicketSlaFlag.OK);
    }

    public TicketSlaFlag evaluateFlag(Ticket ticket, LocalDateTime referenceTime) {
        TicketSlaFlag flag = TicketSlaFlag.OK;

        double responseRatio = SlaTimeCalculator.elapsedRatio(
                ticket.getSlaResponseDeadline(),
                RESPONSE_DEADLINES.get(ticket.getPriority()),
                referenceTime
        );
        flag = mostCritical(flag, toFlag(responseRatio));

        double resolutionRatio = SlaTimeCalculator.elapsedRatio(
                ticket.getSlaResolutionDeadline(),
                RESOLUTION_DEADLINES.get(ticket.getPriority()),
                referenceTime
        );
        flag = mostCritical(flag, toFlag(resolutionRatio));

        return flag;
    }

    private TicketSlaFlag toFlag(double ratio) {
        if (ratio >= 1.0) {
            return TicketSlaFlag.BREACHED;
        }
        if (ratio >= NEAR_THRESHOLD) {
            return TicketSlaFlag.NEAR;
        }
        return TicketSlaFlag.OK;
    }

    private TicketSlaFlag mostCritical(TicketSlaFlag current, TicketSlaFlag other) {
        if (other == TicketSlaFlag.BREACHED) {
            return TicketSlaFlag.BREACHED;
        }
        if (other == TicketSlaFlag.NEAR && current == TicketSlaFlag.OK) {
            return TicketSlaFlag.NEAR;
        }
        return current;
    }
}