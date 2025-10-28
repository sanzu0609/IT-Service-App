package org.example.backend.domain.department.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.persistence.EntityNotFoundException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.example.backend.domain.department.dto.DepartmentDto;
import org.example.backend.domain.department.dto.DepartmentLiteDto;
import org.example.backend.domain.department.dto.request.CreateDepartmentRequest;
import org.example.backend.domain.department.dto.request.UpdateDepartmentRequest;
import org.example.backend.domain.department.entity.Department;
import org.example.backend.domain.user.repository.DepartmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class DepartmentServiceTest {

    @Mock
    private DepartmentRepository departmentRepository;

    @InjectMocks
    private DepartmentService departmentService;

    @BeforeEach
    void setUpDefaults() {
        lenient().when(departmentRepository.existsByCodeIgnoreCase(any())).thenReturn(false);
        lenient().when(departmentRepository.existsByNameIgnoreCase(any())).thenReturn(false);
    }

    @Test
    void create_shouldUppercaseCodeAndPersist() {
        CreateDepartmentRequest request = new CreateDepartmentRequest("it ", " Information Technology ", "Tech team", null);

        when(departmentRepository.save(any(Department.class))).thenAnswer(invocation -> {
            Department department = invocation.getArgument(0);
            ReflectionTestUtils.setField(department, "id", 10L);
            Instant now = Instant.now();
            ReflectionTestUtils.setField(department, "createdAt", now);
            ReflectionTestUtils.setField(department, "updatedAt", now);
            return department;
        });

        DepartmentDto result = departmentService.create(request);

        assertThat(result.id()).isEqualTo(10L);
        assertThat(result.code()).isEqualTo("IT");
        assertThat(result.name()).isEqualTo("Information Technology");
        assertThat(result.description()).isEqualTo("Tech team");
        assertThat(result.active()).isTrue();
    }

    @Test
    void create_shouldRejectDuplicateCode() {
        when(departmentRepository.existsByCodeIgnoreCase("IT")).thenReturn(true);

        CreateDepartmentRequest request = new CreateDepartmentRequest("IT", "Information Technology", null, null);

        assertThatThrownBy(() -> departmentService.create(request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("code already exists");
    }

    @Test
    void update_shouldAllowDeactivation() {
        Department department = buildDepartment(5L, "IT", "Information Technology", true);

        when(departmentRepository.findById(5L)).thenReturn(Optional.of(department));
        when(departmentRepository.save(department)).thenReturn(department);

        UpdateDepartmentRequest request = new UpdateDepartmentRequest(null, null, null, false);

        DepartmentDto result = departmentService.update(5L, request);

        assertThat(result.active()).isFalse();
        verify(departmentRepository).save(department);
    }

    @Test
    void update_shouldRejectDuplicateName() {
        Department department = buildDepartment(7L, "OPS", "Operations", true);

        when(departmentRepository.findById(7L)).thenReturn(Optional.of(department));
        when(departmentRepository.existsByNameIgnoreCaseAndIdNot("Information Technology", 7L)).thenReturn(true);

        UpdateDepartmentRequest request = new UpdateDepartmentRequest(null, "Information Technology", null, null);

        assertThatThrownBy(() -> departmentService.update(7L, request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("name already exists");
    }

    @Test
    void getById_shouldThrowWhenMissing() {
        when(departmentRepository.findById(123L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> departmentService.getById(123L))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("Department not found with id: 123");
    }

    @Test
    void minimal_shouldReturnActiveOnlyWhenRequested() {
        Department active = buildDepartment(1L, "IT", "Information Technology", true);
        when(departmentRepository.findByActiveOrderByNameAsc(true)).thenReturn(List.of(active));

        List<DepartmentLiteDto> results = departmentService.minimal(true);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).code()).isEqualTo("IT");
        verify(departmentRepository).findByActiveOrderByNameAsc(true);
    }

    private Department buildDepartment(Long id, String code, String name, boolean active) {
        Department department = new Department(code, name, name + " team");
        department.setActive(active);
        ReflectionTestUtils.setField(department, "id", id);
        Instant now = Instant.now();
        ReflectionTestUtils.setField(department, "createdAt", now);
        ReflectionTestUtils.setField(department, "updatedAt", now);
        return department;
    }
}
