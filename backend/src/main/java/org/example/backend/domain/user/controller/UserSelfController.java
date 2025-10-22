package org.example.backend.domain.user.controller;

import jakarta.validation.Valid;
import org.example.backend.domain.user.dto.request.ChangePasswordRequest;
import org.example.backend.domain.user.service.UserSelfService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users")
@Validated
public class UserSelfController {

    private final UserSelfService userSelfService;

    public UserSelfController(UserSelfService userSelfService) {
        this.userSelfService = userSelfService;
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(
            Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        Long userId = ControllerUtils.requirePrincipal(authentication).getId();
        userSelfService.changePassword(userId, request);
        return ResponseEntity.noContent().build();
    }
}
