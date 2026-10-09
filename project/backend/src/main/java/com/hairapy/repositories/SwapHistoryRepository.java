package com.hairapy.repositories;

import com.hairapy.models.SwapHistory;
import com.hairapy.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SwapHistoryRepository extends JpaRepository<SwapHistory, Long> {

    List<SwapHistory> findByUserOrderByCreatedAtDesc(User user);

    Optional<SwapHistory> findByIdAndUser(Long id, User user);

    long countByUser(User user);

    @Query("SELECT s FROM SwapHistory s WHERE s.user.id = :userId")
    List<SwapHistory> findByUserId(@Param("userId") Long userId);

    List<SwapHistory> findByCreatedAtBefore(LocalDateTime cutoff);

    @Modifying
    @Query("DELETE FROM SwapHistory s WHERE s.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}
