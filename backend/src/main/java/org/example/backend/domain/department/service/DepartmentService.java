package org.example.backend.domain.department.service;

import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import java.util.stream.Collectors;
import org.example.backend.domain.department.dto.DepartmentDto;
import org.example.backend.domain.department.dto.DepartmentLiteDto;
import org.example.backend.domain.department.dto.request.CreateDepartmentRequest;
import org.example.backend.domain.department.dto.request.UpdateDepartmentRequest;
import org.example.backend.domain.department.entity.Department;
import org.example.backend.domain.user.repository.DepartmentRepository;
import org.example.backend.domain.user.repository.DepartmentSpecifications;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DepartmentService {

    private final DepartmentRepository departmentRepository;

    public DepartmentService(DepartmentRepository departmentRepository) {
        this.departmentRepository = departmentRepository;
    }

    @Transactional(readOnly = true)
    public Page<DepartmentDto> search(String keyword, Boolean active, Pageable pageable) {
        return departmentRepository.findAll(
                DepartmentSpecifications.withFilters(keyword, active),
                pageable
        ).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public DepartmentDto getById(Long id) {
        return toDto(findById(id));
    }

    @Transactional
    public DepartmentDto create(CreateDepartmentRequest request) {
        String normalizedCode = normalizeCode(request.code());
        validateUniqueCode(normalizedCode);

        String normalizedName = normalizeName(request.name());
        validateUniqueName(normalizedName);

        Department department = new Department(
                normalizedCode,
                normalizedName,
                normalizeDescription(request.description())
        );

        department.setActive(request.active() == null || request.active());

        Department saved = departmentRepository.save(department);
        return toDto(saved);
    }

    @Transactional
    public DepartmentDto update(Long id, UpdateDepartmentRequest request) {
        Department department = findById(id);

        if (request.code() != null) {
            String normalizedCode = normalizeCode(request.code());
            if (!normalizedCode.equalsIgnoreCase(department.getCode())
                    && departmentRepository.existsByCodeIgnoreCaseAndIdNot(normalizedCode, id)) {
                throw new IllegalStateException("Department code already exists.");
            }
            department.setCode(normalizedCode);
        }

        if (request.name() != null) {
            String normalizedName = normalizeName(request.name());
            if (!normalizedName.equalsIgnoreCase(department.getName())
                    && departmentRepository.existsByNameIgnoreCaseAndIdNot(normalizedName, id)) {
                throw new IllegalStateException("Department name already exists.");
            }
            department.setName(normalizedName);
        }

        if (request.description() != null) {
            department.setDescription(normalizeDescription(request.description()));
        }

        if (request.active() != null) {
            department.setActive(request.active());
        }

        Department updated = departmentRepository.save(department);
        return toDto(updated);
    }

    @Transactional
    public void deactivate(Long id) {
        Department department = findById(id);
        department.setActive(false);
    }

    @Transactional(readOnly = true)
    public List<DepartmentLiteDto> minimal(Boolean active) {
        List<Department> departments = active == null
                ? departmentRepository.findAllByOrderByNameAsc()
                : departmentRepository.findByActiveOrderByNameAsc(active);

        return departments.stream()
                .map(this::toLiteDto)
                .collect(Collectors.toList());
    }

    private Department findById(Long id) {
        return departmentRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Department not found with id: " + id));
    }

    private void validateUniqueCode(String code) {
        if (departmentRepository.existsByCodeIgnoreCase(code)) {
            throw new IllegalStateException("Department code already exists.");
        }
    }

    private void validateUniqueName(String name) {
        if (departmentRepository.existsByNameIgnoreCase(name)) {
            throw new IllegalStateException("Department name already exists.");
        }
    }

    private String normalizeCode(String code) {
        if (code == null) {
            throw new IllegalArgumentException("Code is required.");
        }
        String trimmed = code.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("Code is required.");
        }
        return trimmed.toUpperCase();
    }

    private String normalizeName(String name) {
        if (name == null) {
            throw new IllegalArgumentException("Name is required.");
        }
        String trimmed = name.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("Name is required.");
        }
        return trimmed;
    }

    private String normalizeDescription(String description) {
        if (description == null) {
            return null;
        }
        String trimmed = description.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private DepartmentDto toDto(Department department) {
        return new DepartmentDto(
                department.getId(),
                department.getCode(),
                department.getName(),
                department.getDescription(),
                department.isActive(),
                department.getCreatedAt(),
                department.getUpdatedAt()
        );
    }

    private DepartmentLiteDto toLiteDto(Department department) {
        return new DepartmentLiteDto(
                department.getId(),
                department.getCode(),
                department.getName()
        );
    }
}
