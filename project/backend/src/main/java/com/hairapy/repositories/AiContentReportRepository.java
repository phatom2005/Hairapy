package com.hairapy.repositories;

import com.hairapy.models.AiContentReport;
import com.hairapy.models.AiReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface AiContentReportRepository extends JpaRepository<AiContentReport, Long> {

    /** Đếm số báo cáo user gửi sau thời điểm chỉ định (chống spam). */
    long countByUserIdAndCreatedAtAfter(Long userId, LocalDateTime after);

    /** Danh sách báo cáo cho admin kèm user (tránh N+1). Sắp xếp theo Pageable. */
    @Query(value = "SELECT r FROM AiContentReport r JOIN FETCH r.user",
           countQuery = "SELECT COUNT(r) FROM AiContentReport r")
    Page<AiContentReport> findAllWithUser(Pageable pageable);

    @Query(value = "SELECT r FROM AiContentReport r JOIN FETCH r.user WHERE r.status = :status",
           countQuery = "SELECT COUNT(r) FROM AiContentReport r WHERE r.status = :status")
    Page<AiContentReport> findAllByStatusWithUser(@Param("status") AiReportStatus status, Pageable pageable);

    long countByStatus(AiReportStatus status);

    /** Xoá toàn bộ báo cáo của user khi xoá tài khoản. */
    @Modifying
    @Query("DELETE FROM AiContentReport r WHERE r.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}
