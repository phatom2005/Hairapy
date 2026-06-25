package com.hairapy.repositories;

import com.hairapy.models.ScanHistory;
import com.hairapy.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository JPA cho thực thể ScanHistory.
 */
@Repository
public interface ScanHistoryRepository extends JpaRepository<ScanHistory, Long> {

    List<ScanHistory> findByUserOrderByCreatedAtDesc(User user);

    long countByUser(User user);
}
