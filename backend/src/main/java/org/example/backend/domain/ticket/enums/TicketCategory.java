package org.example.backend.domain.ticket.enums;

public enum TicketCategory {
    HARDWARE("Hardware"),
    SOFTWARE("Software"),
    NETWORK("Network"),
    SECURITY("Security"),
    ACCESS("Access"),
    SERVICES("Services");

    private final String label;

    TicketCategory(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}

