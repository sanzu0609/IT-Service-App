package org.example.backend.domain.ticket.service;

import java.time.Year;
import java.util.concurrent.atomic.AtomicInteger;
import org.example.backend.domain.ticket.repository.TicketRepository;
import org.springframework.stereotype.Component;

@Component
public class TicketNumberGenerator {

    private static final String FORMAT = "ITSM-%d-%04d";

    private final TicketRepository ticketRepository;
    private final AtomicInteger sequence = new AtomicInteger(0);
    private int cachedYear = Year.now().getValue();

    public TicketNumberGenerator(TicketRepository ticketRepository) {
        this.ticketRepository = ticketRepository;
    }

    public synchronized String nextTicketNumber() {
        int year = Year.now().getValue();
        if (year != cachedYear) {
            cachedYear = year;
            sequence.set(0);
        }

        String candidate;
        int attempt = 0;
        do {
            int value = sequence.incrementAndGet();
            candidate = FORMAT.formatted(year, value);
            attempt++;
        } while (ticketRepository.existsByTicketNumber(candidate) && attempt < 10_000);

        if (ticketRepository.existsByTicketNumber(candidate)) {
            throw new IllegalStateException("Could not generate unique ticket number.");
        }

        return candidate;
    }
}
