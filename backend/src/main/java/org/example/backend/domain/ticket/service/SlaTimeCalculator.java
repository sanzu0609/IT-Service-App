package org.example.backend.domain.ticket.service;

import java.time.Duration;
import java.time.LocalDateTime;

final class SlaTimeCalculator {

    private SlaTimeCalculator() {
    }

    static double elapsedRatio(LocalDateTime deadline, Duration duration, LocalDateTime referenceTime) {
        if (deadline == null || duration == null || referenceTime == null) {
            return 0.0;
        }
        if (duration.isZero() || duration.isNegative()) {
            return 0.0;
        }
        LocalDateTime start = deadline.minus(duration);
        if (!referenceTime.isAfter(start)) {
            return 0.0;
        }
        Duration elapsed = Duration.between(start, referenceTime);
        return (double) elapsed.toMillis() / (double) duration.toMillis();
    }
}