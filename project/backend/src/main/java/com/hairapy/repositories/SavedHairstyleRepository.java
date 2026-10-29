package com.hairapy.repositories;

import com.hairapy.models.SavedHairstyle;
import com.hairapy.models.User;
import com.hairapy.models.HairstyleCatalog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository JPA cho thực thể SavedHairstyle.
 */
@Repository
public interface SavedHairstyleRepository extends JpaRepository<SavedHairstyle, Long> {

    List<SavedHairstyle> findByUserOrderByCreatedAtDesc(User user);

    Optional<SavedHairstyle> findByUserAndHairstyle(User user, HairstyleCatalog hairstyle);

    boolean existsByUserAndHairstyle(User user, HairstyleCatalog hairstyle);

    long countByHairstyleId(Long hairstyleId);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(sh) FROM SavedHairstyle sh WHERE sh.createdAt >= :start AND sh.createdAt < :end")
    long countBetween(@org.springframework.data.repository.query.Param("start") java.time.LocalDateTime start,
                      @org.springframework.data.repository.query.Param("end") java.time.LocalDateTime end);

    void deleteByUserId(Long userId);

    // Top kiểu tóc được lưu yêu thích: [hairstyleId, số lượt lưu]
    @org.springframework.data.jpa.repository.Query("SELECT sh.hairstyle.id, COUNT(sh) FROM SavedHairstyle sh GROUP BY sh.hairstyle.id ORDER BY COUNT(sh) DESC")
    java.util.List<Object[]> topSaved(org.springframework.data.domain.Pageable pageable);

    // Đếm lượt lưu theo hairstyleId giữa 2 mốc thời gian: [hairstyleId, số lượt]
    @org.springframework.data.jpa.repository.Query("SELECT sh.hairstyle.id, COUNT(sh) FROM SavedHairstyle sh "
            + "WHERE sh.createdAt >= :since AND sh.createdAt < :until GROUP BY sh.hairstyle.id")
    java.util.List<Object[]> countSavesBetween(@org.springframework.data.repository.query.Param("since") java.time.LocalDateTime since,
                                              @org.springframework.data.repository.query.Param("until") java.time.LocalDateTime until);
}
