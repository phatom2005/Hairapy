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
import java.util.List;

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

    /**
     * Tính tổng số sao đánh giá đã nhận từ trước đến nay.
     */
    @Query("SELECT COALESCE(SUM(f.rating), 0) FROM Feedback f")
    long sumRating();

    /**
     * Thống kê số lượng đánh giá theo từng mức sao: [rating, count].
     */
    @Query("SELECT f.rating, COUNT(f) FROM Feedback f GROUP BY f.rating")
    List<Object[]> countByRating();

    /**
     * Lấy toàn bộ danh sách feedback cho admin kèm thông tin user (tránh N+1).
     */
    @Query(value = "SELECT f FROM Feedback f JOIN FETCH f.user ORDER BY f.createdAt DESC",
           countQuery = "SELECT COUNT(f) FROM Feedback f")
    Page<Feedback> findAllWithUser(Pageable pageable);

    /**
     * Lấy danh sách feedback lọc theo số sao cụ thể kèm thông tin user (tránh N+1).
     */
    @Query(value = "SELECT f FROM Feedback f JOIN FETCH f.user WHERE f.rating = :rating ORDER BY f.createdAt DESC",
           countQuery = "SELECT COUNT(f) FROM Feedback f WHERE f.rating = :rating")
    Page<Feedback> findAllByRatingWithUser(@Param("rating") Integer rating, Pageable pageable);
}
