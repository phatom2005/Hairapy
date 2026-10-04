package com.hairapy.repositories;

import com.hairapy.models.Feedback;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    /**
     * Đếm số lượt feedback của user gửi sau thời điểm chỉ định (chống spam 24h).
     */
    long countByUserIdAndCreatedAtAfter(Long userId, LocalDateTime after);

    /**
     * Ẩn danh hoá: Xoá nội dung nhận xét của user khi xoá tài khoản, giữ lại số sao đánh giá.
     */
    @Modifying
    @Query("UPDATE Feedback f SET f.comment = NULL WHERE f.user.id = :userId")
    int clearCommentsByUserId(@Param("userId") Long userId);
}
