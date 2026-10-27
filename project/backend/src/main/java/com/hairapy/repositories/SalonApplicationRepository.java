package com.hairapy.repositories;

import com.hairapy.models.ApplicationStatus;
import com.hairapy.models.SalonApplication;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SalonApplicationRepository extends JpaRepository<SalonApplication, Long> {

    List<SalonApplication> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<SalonApplication> findFirstByUserIdAndStatus(Long userId, ApplicationStatus status);

    Page<SalonApplication> findByStatusOrderByCreatedAtDesc(ApplicationStatus status, Pageable pageable);

    Page<SalonApplication> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByStatus(ApplicationStatus status);

    @Modifying
    @Query("DELETE FROM SalonApplication a WHERE a.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}
