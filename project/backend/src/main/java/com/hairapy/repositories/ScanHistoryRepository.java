package com.hairapy.repositories;

import com.hairapy.models.ScanHistory;
import com.hairapy.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository JPA cho thực thể ScanHistory.
 */
@Repository
public interface ScanHistoryRepository extends JpaRepository<ScanHistory, Long> {

    List<ScanHistory> findByUserOrderByCreatedAtDesc(User user);

    List<ScanHistory> findAllByOrderByCreatedAtDesc();

    List<ScanHistory> findByCreatedAtAfterOrderByCreatedAtDesc(java.time.LocalDateTime since);

    List<ScanHistory> findByUserId(Long userId);

    long countByUser(User user);

    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    void deleteByUserId(Long userId);
}
