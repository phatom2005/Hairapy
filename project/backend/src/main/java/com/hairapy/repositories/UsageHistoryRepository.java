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
}
