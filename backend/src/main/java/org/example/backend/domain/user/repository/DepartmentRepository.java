package org.example.backend.domain.user.repository;

import java.util.List;
import java.util.Optional;
import org.example.backend.domain.user.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, Long> {

    Optional<Department> findByCodeIgnoreCase(String code);

    List<Department> findByActiveTrueOrderByNameAsc();
}
