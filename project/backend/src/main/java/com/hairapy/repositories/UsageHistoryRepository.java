package com.hairapy.repositories;

import com.hairapy.models.UsageHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface UsageHistoryRepository extends JpaRepository<UsageHistory, Long> {

    // Tìm lịch sử của một user cụ thể có phân trang
    Page<UsageHistory> findByUserId(Long userId, Pageable pageable);

    // Đếm lượt dùng theo feature (cho dashboard stats)
    long countByFeature(String feature);

    // Đếm lượt dùng từ thời điểm cụ thể
    @Query("SELECT COUNT(u) FROM UsageHistory u WHERE u.feature = :feature AND u.usedAt >= :since")
    long countByFeatureSince(@Param("feature") String feature, @Param("since") LocalDateTime since);

    // Đếm lượt dùng của một user cụ thể từ thời điểm cụ thể (hôm nay)
    @Query("SELECT COUNT(u) FROM UsageHistory u WHERE u.user.id = :userId AND u.feature = :feature AND u.usedAt >= :since")
    long countTodayUsage(@Param("userId") Long userId, @Param("feature") String feature, @Param("since") LocalDateTime since);

    // Thống kê theo ngày trong 30 ngày gần nhất (cho chart)
    @Query("SELECT CAST(u.usedAt AS date) as day, COUNT(u) as count FROM UsageHistory u WHERE u.usedAt >= :since GROUP BY CAST(u.usedAt AS date) ORDER BY day")
    List<Object[]> countDailyUsageSince(@Param("since") LocalDateTime since);

    // Thống kê theo tháng (dùng khi range > 90 ngày)
    @Query("SELECT FUNCTION('to_char', u.usedAt, 'YYYY-MM') as month, COUNT(u) as count FROM UsageHistory u WHERE u.usedAt >= :since GROUP BY FUNCTION('to_char', u.usedAt, 'YYYY-MM') ORDER BY month")
    List<Object[]> countMonthlyUsageSince(@Param("since") LocalDateTime since);

    void deleteByUserId(Long userId);

    // Top kiểu tóc được thử bằng AI từ mốc since: [hairstyleId, số lượt] (chỉ có dữ liệu từ migration V26 trở đi)
    @org.springframework.data.jpa.repository.Query("SELECT u.hairstyleId, COUNT(u) FROM UsageHistory u WHERE u.feature = 'HAIR_SWAP' "
            + "AND u.hairstyleId IS NOT NULL AND u.usedAt >= :since GROUP BY u.hairstyleId ORDER BY COUNT(u) DESC")
    java.util.List<Object[]> topTriedSince(@org.springframework.data.repository.query.Param("since") java.time.LocalDateTime since,
                                           org.springframework.data.domain.Pageable pageable);

    // Thời điểm lượt thử có ghi kiểu tóc ĐẦU TIÊN (để trình bày "số liệu tính từ ngày...")
    @org.springframework.data.jpa.repository.Query("SELECT MIN(u.usedAt) FROM UsageHistory u WHERE u.hairstyleId IS NOT NULL")
    java.time.LocalDateTime firstTrackedAt();
}
