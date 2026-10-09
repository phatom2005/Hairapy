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

    void deleteByUserId(Long userId);

    // Top kiểu tóc được lưu yêu thích: [hairstyleId, số lượt lưu]
    @org.springframework.data.jpa.repository.Query("SELECT sh.hairstyle.id, COUNT(sh) FROM SavedHairstyle sh GROUP BY sh.hairstyle.id ORDER BY COUNT(sh) DESC")
    java.util.List<Object[]> topSaved(org.springframework.data.domain.Pageable pageable);
}
