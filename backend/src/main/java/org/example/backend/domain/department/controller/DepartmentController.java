package org.example.backend.domain.department.controller;

import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.example.backend.domain.department.dto.DepartmentDto;
import org.example.backend.domain.department.dto.DepartmentLiteDto;
import org.example.backend.domain.department.dto.request.CreateDepartmentRequest;
import org.example.backend.domain.department.dto.request.UpdateDepartmentRequest;
import org.example.backend.domain.department.service.DepartmentService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
@RequestMapping("/api/departments")
@Validated
public class DepartmentController {

    private final DepartmentService departmentService;

    public DepartmentController(DepartmentService departmentService) {
        this.departmentService = departmentService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Page<DepartmentDto> search(
            @RequestParam(value = "q", required = false) String keyword,
            @RequestParam(value = "active", required = false) Boolean active,
            @PageableDefault(size = 20, sort = "id") Pageable pageable
    ) {
        return departmentService.search(keyword, active, pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public DepartmentDto getById(@PathVariable Long id) {
        return departmentService.getById(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DepartmentDto> create(@Valid @RequestBody CreateDepartmentRequest request) {
        DepartmentDto department = departmentService.create(request);
        return ResponseEntity
                .created(URI.create("/api/departments/" + department.id()))
                .body(department);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public DepartmentDto update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDepartmentRequest request
    ) {
        return departmentService.update(id, request);
    }

    @GetMapping("/minimal")
    @PreAuthorize("isAuthenticated()")
    public List<DepartmentLiteDto> minimal(
            @RequestParam(value = "active", required = false) Boolean active
    ) {
        Boolean filter = active == null ? Boolean.TRUE : active;
        return departmentService.minimal(filter);
    }
}
