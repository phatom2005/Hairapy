package com.hairapy.repositories;

import com.hairapy.models.Subscription;
import com.hairapy.models.SubscriptionPlan;
import com.hairapy.models.SubscriptionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {

    // Tìm tất cả subscription có phân trang (JpaRepository đã có findAll(Pageable))
    
    // Tìm subscription theo trạng thái
    Page<Subscription> findByStatus(SubscriptionStatus status, Pageable pageable);

    // Tìm danh sách subscription theo userId
    List<Subscription> findByUserId(Long userId);

    // Tìm subscription theo userId và trạng thái
    Optional<Subscription> findByUserIdAndStatus(Long userId, SubscriptionStatus status);

    // Đếm subscription active theo plan (cho dashboard stats)
    long countByStatusAndPlan(SubscriptionStatus status, SubscriptionPlan plan);

    // Đếm subscription theo trạng thái
    long countByStatus(SubscriptionStatus status);

    // Tìm các subscription active có ngày hết hạn trước mốc thời gian truyền vào
    List<Subscription> findByStatusAndEndDateBefore(SubscriptionStatus status, LocalDateTime dateTime);

    void deleteByUserId(Long userId);

    // Số gói đang THỰC SỰ hoạt động (ACTIVE và chưa hết hạn) theo từng plan
    @org.springframework.data.jpa.repository.Query("SELECT s.plan, COUNT(s) FROM Subscription s WHERE s.status = com.hairapy.models.SubscriptionStatus.ACTIVE "
            + "AND (s.endDate IS NULL OR s.endDate > :now) GROUP BY s.plan")
    java.util.List<Object[]> countActiveByPlan(@org.springframework.data.repository.query.Param("now") java.time.LocalDateTime now);

    // Số user có gói hết hạn trong khoảng [from, now] và hiện KHÔNG còn gói ACTIVE nào (rời bỏ)
    @org.springframework.data.jpa.repository.Query("SELECT COUNT(DISTINCT s.user.id) FROM Subscription s WHERE s.status = com.hairapy.models.SubscriptionStatus.EXPIRED "
            + "AND s.endDate >= :from AND s.endDate <= :now "
            + "AND NOT EXISTS (SELECT 1 FROM Subscription a WHERE a.user.id = s.user.id "
            + "AND a.status = com.hairapy.models.SubscriptionStatus.ACTIVE)")
    long countChurnedBetween(@org.springframework.data.repository.query.Param("from") java.time.LocalDateTime from, @org.springframework.data.repository.query.Param("now") java.time.LocalDateTime now);
}
