package com.hairapy.repositories;

import com.hairapy.models.Subscription;
import com.hairapy.models.SubscriptionPlan;
import com.hairapy.models.SubscriptionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

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
}
