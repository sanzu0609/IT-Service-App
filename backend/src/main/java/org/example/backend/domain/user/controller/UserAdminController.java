package org.example.backend.domain.user.controller;

import jakarta.validation.Valid;
import org.example.backend.domain.user.dto.request.CreateUserRequest;
import org.example.backend.domain.user.dto.request.ResetPasswordRequest;
import org.example.backend.domain.user.dto.request.UpdateUserRequest;
import org.example.backend.domain.user.dto.response.UserDetailResponse;
import org.example.backend.domain.user.dto.response.UserSummaryResponse;
import org.example.backend.domain.user.enums.UserRole;
import org.example.backend.domain.user.service.UserAdminService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@Validated
public class UserAdminController {

    private final UserAdminService userAdminService;

    public UserAdminController(UserAdminService userAdminService) {
        this.userAdminService = userAdminService;
    }

    @PostMapping
    public ResponseEntity<UserSummaryResponse> createUser(@Valid @RequestBody CreateUserRequest request) {
        UserSummaryResponse response = userAdminService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public Page<UserSummaryResponse> listUsers(
            @RequestParam(value = "q", required = false) String keyword,
            @RequestParam(value = "role", required = false) UserRole role,
            @RequestParam(value = "departmentId", required = false) Long departmentId,
            @RequestParam(value = "active", required = false) Boolean active,
            @PageableDefault(size = 20, sort = "id") Pageable pageable
    ) {
        return userAdminService.listUsers(keyword, role, departmentId, active, pageable);
    }

    @GetMapping("/{id}")
    public UserDetailResponse getUser(@PathVariable Long id) {
        return userAdminService.getUser(id);
    }

    @PatchMapping("/{id}")
    public UserDetailResponse updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request,
            Authentication authentication
    ) {
        Long actingUserId = ControllerUtils.requirePrincipal(authentication).getId();
        return userAdminService.updateUser(id, request, actingUserId);
    }

    @PostMapping("/{id}/reset-password")
    public UserSummaryResponse resetPassword(
            @PathVariable Long id,
            @Valid @RequestBody ResetPasswordRequest request
    ) {
        return userAdminService.resetPassword(id, request);
    }
}
