package com.hairapy.repositories;

import com.hairapy.models.SalonPartnerPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SalonPartnerPaymentRepository extends JpaRepository<SalonPartnerPayment, Long> {

    List<SalonPartnerPayment> findBySalonIdOrderByCreatedAtDesc(Long salonId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM SalonPartnerPayment p WHERE p.createdAt >= :start AND p.createdAt < :end")
    long sumAmountBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM SalonPartnerPayment p WHERE p.createdAt >= :since")
    long sumAmountSince(@Param("since") LocalDateTime since);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM SalonPartnerPayment p")
    long sumAllAmount();
}
